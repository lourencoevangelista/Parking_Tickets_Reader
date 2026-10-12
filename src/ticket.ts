import { z } from "zod"

/** What the vision model reads off a parking ticket. Field names match the `Tickets` table in db/schema.ts. */
export const TicketSchema = z.object({
  ticketNumber: z.string().trim().min(1, "Ticket number cannot be empty.").describe("Ticket number as printed on the ticket."),
  entryTime: z.iso
    .datetime({ offset: true, local: true })
    .optional()
    .describe("Entry date and time converted to ISO 8601 (e.g. 2026-10-11T08:30:00). Omit if not printed."),
})

export type Ticket = z.infer<typeof TicketSchema>
