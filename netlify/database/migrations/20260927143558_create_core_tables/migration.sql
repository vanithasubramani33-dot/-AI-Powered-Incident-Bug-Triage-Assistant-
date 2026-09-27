CREATE TABLE "bugs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" text NOT NULL,
	"description" text NOT NULL,
	"steps_to_reproduce" text DEFAULT '' NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"severity" text DEFAULT 'Medium' NOT NULL,
	"environment" text DEFAULT 'Production' NOT NULL,
	"reporter" text NOT NULL,
	"category" text,
	"priority" text,
	"status" text DEFAULT 'Open' NOT NULL,
	"assigned_team" text,
	"assigned_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"bug_id" uuid NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"priority" text NOT NULL,
	"root_cause" text NOT NULL,
	"suggested_team" text NOT NULL,
	"suggested_assignee" text DEFAULT 'Unassigned' NOT NULL,
	"recommended_action" text NOT NULL,
	"confidence_score" integer NOT NULL,
	"engine" text DEFAULT 'rule-based' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'developer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "triage_results" ADD CONSTRAINT "triage_results_bug_id_bugs_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "bugs"("id") ON DELETE CASCADE;