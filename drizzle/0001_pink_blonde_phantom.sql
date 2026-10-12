ALTER TABLE "tickets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_ticket_number_unique";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "entry_time" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "entry_time" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "scan_count" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "scan_count" SET DEFAULT '1';--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "exit_time" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_ticket_number_idx" ON "tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_id_idx" ON "tickets" USING btree ("id");--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "image_path";--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "first_scanned_at";