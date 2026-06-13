CREATE TABLE IF NOT EXISTS "assistant_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "tone" text DEFAULT 'Balanced' NOT NULL,
  "autonomy" text DEFAULT 'Confirm' NOT NULL,
  "custom_personality" text DEFAULT '' NOT NULL,
  "allow_task_creation" boolean DEFAULT true NOT NULL,
  "allow_reminder_drafts" boolean DEFAULT true NOT NULL,
  "allow_sensitive_actions" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistant_profiles" ADD CONSTRAINT "assistant_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assistant_profiles_user_id_unique" ON "assistant_profiles" ("user_id");
