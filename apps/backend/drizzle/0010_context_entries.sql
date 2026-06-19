DO $$ BEGIN
 CREATE TYPE "public"."context_kind" AS ENUM('note', 'preference', 'summary', 'instruction');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "context_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "client_id" uuid,
  "kind" "context_kind" DEFAULT 'note' NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "source" text DEFAULT 'manual' NOT NULL,
  "importance" text DEFAULT 'normal' NOT NULL,
  "pinned" boolean DEFAULT false NOT NULL,
  "metadata" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "context_entries" ADD CONSTRAINT "context_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "context_entries" ADD CONSTRAINT "context_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "context_entries_user_created_idx" ON "context_entries" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "context_entries_client_created_idx" ON "context_entries" ("client_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "context_entries_kind_idx" ON "context_entries" ("kind");
