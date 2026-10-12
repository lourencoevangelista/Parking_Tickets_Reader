import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const Tickets = pgTable(
  "tickets",
  {
    ticketNumber: text("ticket_number").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    entryTime: timestamp("entry_time", { withTimezone: true })
      .notNull()
      .defaultNow(),
    exitTime: timestamp("exit_time", { withTimezone: true }),
    lastScannedAt: timestamp("last_scanned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tickets_ticket_number_idx").on(table.ticketNumber),
    uniqueIndex("tickets_id_idx").on(table.id)
  ]

).enableRLS();

