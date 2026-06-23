CREATE TABLE IF NOT EXISTS "agent_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel_type" "agent_channel_type" DEFAULT 'whatsapp' NOT NULL,
  "external_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'active' NOT NULL,
  "summary_enabled" boolean DEFAULT false NOT NULL,
  "summary_cron_expr" text,
  "summary_timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
  "digest_target" text DEFAULT 'group' NOT NULL,
  "last_message_at" timestamp,
  "last_summary_at" timestamp,
  "metadata" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_group_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'member' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_group_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "sender_contact_value" text,
  "sender_display_name" text,
  "body" text NOT NULL,
  "occurred_at" timestamp DEFAULT now(),
  "metadata" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_group_summaries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "period_start" timestamp,
  "period_end" timestamp,
  "message_count" integer DEFAULT 0 NOT NULL,
  "source" text DEFAULT 'agent' NOT NULL,
  "metadata" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_group_members" ADD CONSTRAINT "agent_group_members_group_id_agent_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "agent_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_group_members" ADD CONSTRAINT "agent_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_group_messages" ADD CONSTRAINT "agent_group_messages_group_id_agent_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "agent_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_group_summaries" ADD CONSTRAINT "agent_group_summaries_group_id_agent_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "agent_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_groups_channel_external_unique" ON "agent_groups" ("channel_type","external_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_groups_status_updated_idx" ON "agent_groups" ("status","updated_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_group_members_group_user_unique" ON "agent_group_members" ("group_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_group_members_group_created_idx" ON "agent_group_members" ("group_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_group_messages_group_occurred_idx" ON "agent_group_messages" ("group_id","occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_group_summaries_group_created_idx" ON "agent_group_summaries" ("group_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_group_summaries_period_idx" ON "agent_group_summaries" ("period_start","period_end");
