import { defineTool } from "@frontal-labs/vibe/tools"
import { z } from "zod"

import { checkTicket } from "./check"
import { extractTicket } from "./extract"
import { loadTicketImage } from "./image"

export const ReadTicketInputSchema = z.object({
  imagePath: z.string().trim().min(1).describe("Path to the ticket image (JPG, PNG or WEBP), relative to the tickets folder."),
})

export interface TicketReaderOptions {
  /** Ollama server URL, e.g. http://localhost:11434. */
  baseUrl: string
  /** A vision-capable Ollama model. */
  visionModel: string
  /** Folder ticket paths are resolved against; paths outside it are rejected. */
  ticketsDir: string
}

/**
 * The agent-facing tool. vibe's message types carry no image blocks, so the tool
 * does the vision step itself and hands the agent validated JSON.
 */
export function createTicketReaderTool({ baseUrl, visionModel, ticketsDir }: TicketReaderOptions) {
  return defineTool({
    name: "read_ticket",
    description:
      "Reads a parking ticket image, registers it (or records a rescan if it already exists) and returns the stored ticket as JSON, with status \"new\" or \"existing\".",
    schema: ReadTicketInputSchema,
    execute: async ({ imagePath }, ctx) => {
      // Errors thrown here (missing file, bad type) reach the model as tool errors.
      const image = await loadTicketImage(imagePath, ticketsDir)
      const result = await extractTicket(image, { baseUrl, model: visionModel, signal: ctx.signal })
      if (!result.ok) return { isError: true, content: result.reason }
      return JSON.stringify(await checkTicket(result.ticket), null, 2)
    },
  })
}
