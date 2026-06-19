CREATE TYPE "report_kind" AS ENUM('manual', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "report_status" AS ENUM('generated', 'delivered', 'delivery_failed', 'delivery_skipped', 'failed');--> statement-breakpoint
CREATE TYPE "report_schedule_frequency" AS ENUM('daily', 'weekly');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "title" text NOT NULL,
  "kind" "report_kind" DEFAULT 'manual' NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "summary" text NOT NULL,
  "payload" text NOT NULL,
  "status" "report_status" DEFAULT 'generated' NOT NULL,
  "delivery_status" text,
  "delivery_message" text,
  "delivered_at" timestamp,
  "generated_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "name" text NOT NULL,
  "frequency" "report_schedule_frequency" DEFAULT 'daily' NOT NULL,
  "timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "deliver" boolean DEFAULT true NOT NULL,
  "next_run_at" timestamp,
  "last_run_at" timestamp,
  "last_run_status" text,
  "last_run_message" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_user_created_idx" ON "reports" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_period_idx" ON "reports" ("period_start", "period_end");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_schedules_due_idx" ON "report_schedules" ("enabled", "next_run_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_schedules_user_created_idx" ON "report_schedules" ("user_id", "created_at");
