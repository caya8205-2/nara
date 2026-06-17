CREATE TYPE "approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approval_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "title" text NOT NULL,
  "action_type" text NOT NULL,
  "source" text DEFAULT 'nara_bot' NOT NULL,
  "risk_level" text DEFAULT 'low' NOT NULL,
  "status" "approval_status" DEFAULT 'pending' NOT NULL,
  "payload" text NOT NULL,
  "result" text,
  "requested_by_type" "audit_actor_type" DEFAULT 'agent' NOT NULL,
  "requested_by_id" uuid,
  "decided_by_type" "audit_actor_type",
  "decided_by_id" uuid,
  "decided_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_requests_user_status_created_idx" ON "approval_requests" ("user_id", "status", "created_at");
