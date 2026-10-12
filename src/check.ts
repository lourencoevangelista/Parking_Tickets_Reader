import { eq } from "drizzle-orm"

import { db } from "../db"
import { Tickets } from "../db/schema"
import type { Ticket } from "./ticket"

export type TicketRow = typeof Tickets.$inferSelect

export type CheckResult = { status: "existing" | "new"; row: TicketRow }

export async function checkTicket(ticket: Ticket): Promise<CheckResult> {
  const [found] = await db
    .select({ id: Tickets.id })
    .from(Tickets)
    .where(eq(Tickets.ticketNumber, ticket.ticketNumber))
    .limit(1)

  if (found) {
    return { status: "existing", row: await handleExisting(found.id) }
  }
  return { status: "new", row: await handleNew(ticket) }
}

async function handleExisting(id: string): Promise<TicketRow> {
  const [row] = await db
    .update(Tickets)
    .set({
      lastScannedAt: new Date(),
      exitTime: new Date() })
    .where(eq(Tickets.id, id))
    .returning()
  return row!
}

async function handleNew(ticket: Ticket): Promise<TicketRow> {
  const [row] = await db
    .insert(Tickets)
    .values({
      ticketNumber: ticket.ticketNumber,
      entryTime: ticket.entryTime ? new Date(ticket.entryTime) : new Date(),
    })
    .returning()
  return row!
}
