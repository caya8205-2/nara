DO $$ BEGIN
 CREATE TYPE "public"."task_priority" AS ENUM('low', 'normal', 'high', 'urgent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."task_source" AS ENUM('manual', 'admin', 'agent', 'scheduled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" "task_priority" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "source" "task_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
