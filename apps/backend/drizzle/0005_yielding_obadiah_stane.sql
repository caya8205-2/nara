DO $$ BEGIN
 CREATE TYPE "public"."reminder_kind" AS ENUM('once', 'recurring');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "cron_expr" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "action" SET DEFAULT 'notify';--> statement-breakpoint
UPDATE "schedules" SET "enabled" = true WHERE "enabled" IS NULL;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "enabled" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "kind" "reminder_kind" DEFAULT 'once' NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "timezone" text DEFAULT 'Asia/Jakarta' NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "source" "task_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
