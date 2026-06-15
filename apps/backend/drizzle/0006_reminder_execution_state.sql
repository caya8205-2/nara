ALTER TABLE "schedules" ADD COLUMN "next_run_at" timestamp;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "last_triggered_at" timestamp;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "last_trigger_status" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "last_trigger_message" text;--> statement-breakpoint
UPDATE "schedules"
SET "next_run_at" = "scheduled_at"
WHERE "enabled" = true
  AND "kind" = 'once'
  AND "scheduled_at" IS NOT NULL
  AND "next_run_at" IS NULL;
