import { fileURLToPath } from "node:url"
import { createAgent } from "@frontal-labs/vibe/agent"
import { openai } from "@frontal-labs/vibe/model"

import { client } from "../db"
import { createTicketReaderTool } from "./tool"

const OLLAMA_URL = (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, "")
const AGENT_MODEL = process.env.OLLAMA_AGENT_MODEL ?? "qwen3-vl:8b"
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? AGENT_MODEL

const ticketsDir = fileURLToPath(new URL("../image/", import.meta.url))
const imagePath = process.argv[2] ?? "ticket.jpg"

const agent = createAgent({
  provider: openai({ baseURL: `${OLLAMA_URL}/v1`, apiKey: "ollama" }),
  model: AGENT_MODEL,
  tools: [createTicketReaderTool({ baseUrl: OLLAMA_URL, visionModel: VISION_MODEL, ticketsDir })],
  system: `You are a scanner that validates parking tickets. Use the read_ticket tool to scan the ticket image, then report the ticket number and entry time.
   If the tool returns status "existing", say the ticket exit time was registered .
   If the tool returns status "new", say the ticket has been registered.
   If the tool returns an error, explain what went wrong instead of inventing values.`,
})

try {
  const result = await agent.run(`Please process the ticket image located at '${imagePath}'.`)
  console.log(result.text)
} catch (error) {
  console.error("Run failed:", error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await client.end({ timeout: 50 })
}
