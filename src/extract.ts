import { z } from "zod"

import type { TicketImage } from "./image"
import { type Ticket, TicketSchema } from "./ticket"

const ExtractionSchema = z.object({
  isTicket: z.boolean().describe("False if the image is not a ticket or is too blurry or cropped to read."),
  reason: z.string().optional().describe("Why the image cannot be read. Only when isTicket is false."),
  ticket: z.unknown().optional().describe("The ticket data. Only when isTicket is true."),
})

const { $schema: _, ...extractionJsonSchema } = z.toJSONSchema(
  ExtractionSchema.extend({ ticket: TicketSchema.optional() }),
  { io: "input" },
)

const PROMPT = `Read this ticket and reply with JSON matching the given schema.
Copy the ticket number exactly as printed.
Convert the entry time to ISO 8601 (YYYY-MM-DDTHH:mm:ss, 24-hour clock, no time zone), e.g. "04/26/2025 10:34 AM" becomes "2025-04-26T10:34:00".
Do not guess values you cannot read — omit optional fields instead.
If the image is not a readable ticket, set isTicket to false and explain why in reason.`

export type ExtractionResult = { ok: true; ticket: Ticket } | { ok: false; reason: string }

export interface ExtractOptions {
  /** Ollama server URL, e.g. http://localhost:11434. */
  baseUrl: string
  /** A vision-capable Ollama model, e.g. qwen3-vl:8b. */
  model: string
  /** Total vision calls, including retries after failed validation. Default 3. */
  maxAttempts?: number
  signal?: AbortSignal
}

interface OllamaMessage {
  role: "user" | "assistant"
  content: string
  images?: string[]
}


export async function extractTicket(
  image: TicketImage,
  { baseUrl, model, maxAttempts = 3, signal }: ExtractOptions,
): Promise<ExtractionResult> {
  const messages: OllamaMessage[] = [{ role: "user", content: PROMPT, images: [image.data] }]
  let lastError = ""

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { content: reply, doneReason } = await chat(baseUrl, { model, messages, format: extractionJsonSchema }, signal)

    let feedback: string
    try {
      if (doneReason === "length") throw new TruncatedReplyError()
      if (!reply.trim()) throw new EmptyReplyError()
      const extraction = ExtractionSchema.parse(JSON.parse(reply))
      if (!extraction.isTicket) {
        return { ok: false, reason: extraction.reason ?? "The image is not a readable ticket." }
      }
      return { ok: true, ticket: TicketSchema.parse(extraction.ticket) }
    } catch (error) {
      if (error instanceof TruncatedReplyError) feedback = "Your reply was cut off before it finished. Reply with the JSON only."
      else if (error instanceof EmptyReplyError) feedback = "Your reply was empty. Reply with the JSON only."
      else if (error instanceof SyntaxError) feedback = "Your reply was not valid JSON."
      else if (error instanceof z.ZodError) feedback = z.prettifyError(error)
      else throw error
    }

    lastError = feedback
    messages.push(
      { role: "assistant", content: reply },
      { role: "user", content: `Validation failed:\n${feedback}\nRe-read the image and reply again with corrected JSON.` },
    )
  }

  return { ok: false, reason: `Could not extract a consistent ticket after ${maxAttempts} attempts:\n${lastError}` }
}

class TruncatedReplyError extends Error {}
class EmptyReplyError extends Error {}

async function chat(
  baseUrl: string,
  body: { model: string; messages: OllamaMessage[]; format: unknown },
  signal?: AbortSignal,
): Promise<{ content: string; doneReason?: string }> {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // Thinking is off: reading a ticket needs no reasoning, and on retries thinking models
    // can spend the whole token budget deliberating and return no content.
    body: JSON.stringify({ ...body, stream: false, think: false, options: { temperature: 0 } }),
    signal,
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText)
    throw new Error(`Ollama request failed (${response.status}): ${detail}`)
  }
  const data = (await response.json()) as { message?: { content?: string }; done_reason?: string }
  return { content: data.message?.content ?? "", doneReason: data.done_reason }
}
