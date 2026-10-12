import { readFile, stat } from "node:fs/promises"
import { extname, relative, resolve } from "node:path"

export type TicketMediaType = "image/jpeg" | "image/png" | "image/webp"

const MEDIA_TYPES: Record<string, TicketMediaType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
}

/** Keeps requests to the local model small; phone photos of tickets fit easily. */
const MAX_BYTES = 10 * 1024 * 1024

export interface TicketImage {
  path: string
  mediaType: TicketMediaType
  data: string
}

export async function loadTicketImage(path: string, baseDir: string): Promise<TicketImage> {
  const fullPath = resolve(baseDir, path)
  const rel = relative(baseDir, fullPath)
  if (rel.startsWith("..") || resolve(rel) === rel) {
    throw new Error(`Ticket path "${path}" is outside the tickets folder.`)
  }

  const ext = extname(fullPath).toLowerCase()
  const mediaType = MEDIA_TYPES[ext]
  if (!mediaType) {
    throw new Error(`Unsupported file type "${ext}". Use one of: ${Object.keys(MEDIA_TYPES).join(", ")}.`)
  }

  const info = await stat(fullPath).catch(() => undefined)
  if (!info?.isFile()) throw new Error(`Ticket image not found: ${path}`)
  if (info.size > MAX_BYTES) {
    throw new Error(`Ticket image is ${(info.size / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_BYTES / 1024 / 1024} MB.`)
  }

  const data = (await readFile(fullPath)).toString("base64")
  return { path: fullPath, mediaType, data }
}
