import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("developer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bugs = pgTable("bugs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  stepsToReproduce: text("steps_to_reproduce").notNull().default(""),
  errorMessage: text("error_message").notNull().default(""),
  severity: text("severity").notNull().default("Medium"),
  environment: text("environment").notNull().default("Production"),
  reporter: text("reporter").notNull(),
  category: text("category"),
  priority: text("priority"),
  status: text("status").notNull().default("Open"),
  assignedTeam: text("assigned_team"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const triageResults = pgTable("triage_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  bugId: uuid("bug_id")
    .notNull()
    .references(() => bugs.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  priority: text("priority").notNull(),
  rootCause: text("root_cause").notNull(),
  suggestedTeam: text("suggested_team").notNull(),
  suggestedAssignee: text("suggested_assignee").notNull().default("Unassigned"),
  recommendedAction: text("recommended_action").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  engine: text("engine").notNull().default("rule-based"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
