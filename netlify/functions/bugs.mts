import type { Config } from "@netlify/functions";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { bugs, triageResults } from "../../db/schema.js";
import { requireUser, AuthError } from "../lib/auth.js";
import { analyzeBug } from "../lib/triageEngine.js";

type Bug = typeof bugs.$inferSelect;
type Triage = typeof triageResults.$inferSelect;

const SEVERITIES = ["Critical", "High", "Medium", "Low"];
const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

function serializeBug(bug: Bug, triage?: Triage | null) {
  const { id, ...rest } = bug;
  return {
    _id: id,
    ...rest,
    triageResult: triage
      ? {
          id: triage.id,
          category: triage.category,
          severity: triage.severity,
          priority: triage.priority,
          rootCause: triage.rootCause,
          suggestedTeam: triage.suggestedTeam,
          suggestedAssignee: triage.suggestedAssignee,
          recommendedAction: triage.recommendedAction,
          confidenceScore: triage.confidenceScore,
          engine: triage.engine,
          createdAt: triage.createdAt,
        }
      : null,
  };
}

async function latestTriageForBug(bugId: string): Promise<Triage | null> {
  const [triage] = await db
    .select()
    .from(triageResults)
    .where(eq(triageResults.bugId, bugId))
    .orderBy(desc(triageResults.createdAt))
    .limit(1);
  return triage || null;
}

async function runTriageForBug(bug: Bug) {
  const result = await analyzeBug(bug);

  const [triage] = await db
    .insert(triageResults)
    .values({
      bugId: bug.id,
      category: result.category,
      severity: result.severity || bug.severity,
      priority: result.priority,
      rootCause: result.rootCause,
      suggestedTeam: result.suggestedTeam,
      suggestedAssignee: result.suggestedAssignee || "Unassigned",
      recommendedAction: result.recommendedAction,
      confidenceScore: result.confidenceScore,
      engine: result.engine || "rule-based",
    })
    .returning();

  const [updatedBug] = await db
    .update(bugs)
    .set({
      category: result.category,
      priority: result.priority,
      assignedTeam: result.suggestedTeam,
      assignedTo: result.suggestedAssignee || "Unassigned",
      updatedAt: new Date(),
    })
    .where(eq(bugs.id, bug.id))
    .returning();

  return { bug: updatedBug, triage };
}

export default async (req: Request) => {
  try {
    await requireUser(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ success: false, message: err.message }, { status: err.status });
    }
    throw err;
  }

  const url = new URL(req.url);
  const segments = url.pathname.replace(/^\/api\/bugs\/?/, "").split("/").filter(Boolean);
  const method = req.method;

  if (segments.length === 2 && segments[0] === "stats" && segments[1] === "dashboard" && method === "GET") {
    return getDashboardStats();
  }

  if (segments.length === 0) {
    if (method === "GET") return getBugs(url);
    if (method === "POST") return createBug(req);
    return new Response("Method not allowed", { status: 405 });
  }

  const id = segments[0];

  if (segments.length === 2 && segments[1] === "status" && method === "PUT") {
    return updateBugStatus(id, req);
  }

  if (segments.length === 2 && segments[1] === "triage" && method === "POST") {
    return triageBug(id);
  }

  if (segments.length === 1) {
    if (method === "GET") return getBugById(id);
    if (method === "PUT") return updateBug(id, req);
    if (method === "DELETE") return deleteBug(id);
    return new Response("Method not allowed", { status: 405 });
  }

  return Response.json({ success: false, message: `Route not found: ${url.pathname}` }, { status: 404 });
};

export const config: Config = {
  path: ["/api/bugs", "/api/bugs/*"],
};

async function createBug(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { title, description, stepsToReproduce, errorMessage, severity, environment, reporter } = body as Record<
    string,
    string
  >;

  if (!title || !description || !reporter) {
    return Response.json({ success: false, message: "title, description and reporter are required" }, { status: 400 });
  }

  const [bug] = await db
    .insert(bugs)
    .values({
      title,
      description,
      stepsToReproduce: stepsToReproduce || "",
      errorMessage: errorMessage || "",
      severity: SEVERITIES.includes(severity) ? severity : "Medium",
      environment: environment || "Production",
      reporter,
    })
    .returning();

  const { bug: updatedBug, triage } = await runTriageForBug(bug);

  return Response.json({ success: true, bug: serializeBug(updatedBug, triage), triage }, { status: 201 });
}

async function triageBug(id: string) {
  const [bug] = await db.select().from(bugs).where(eq(bugs.id, id)).limit(1);
  if (!bug) return Response.json({ success: false, message: "Bug not found" }, { status: 404 });

  const { bug: updatedBug, triage } = await runTriageForBug(bug);
  return Response.json({ success: true, bug: serializeBug(updatedBug, triage), triage });
}

async function getBugs(url: URL) {
  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category");
  const priority = url.searchParams.get("priority");
  const severity = url.searchParams.get("severity");
  const status = url.searchParams.get("status");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

  const conditions = [];
  if (search) {
    conditions.push(
      or(ilike(bugs.title, `%${search}%`), ilike(bugs.description, `%${search}%`), ilike(bugs.errorMessage, `%${search}%`))
    );
  }
  if (category) conditions.push(eq(bugs.category, category));
  if (priority) conditions.push(eq(bugs.priority, priority));
  if (severity) conditions.push(eq(bugs.severity, severity));
  if (status) conditions.push(eq(bugs.status, status));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db.select().from(bugs).where(where).orderBy(desc(bugs.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ count: sql<number>`count(*)::int` }).from(bugs).where(where),
  ]);
  const total = countRows[0]?.count ?? 0;

  return Response.json({
    success: true,
    bugs: rows.map((b) => serializeBug(b)),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

async function getBugById(id: string) {
  const [bug] = await db.select().from(bugs).where(eq(bugs.id, id)).limit(1);
  if (!bug) return Response.json({ success: false, message: "Bug not found" }, { status: 404 });

  const triage = await latestTriageForBug(bug.id);
  return Response.json({ success: true, bug: serializeBug(bug, triage) });
}

async function updateBug(id: string, req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed = [
    "title",
    "description",
    "stepsToReproduce",
    "errorMessage",
    "severity",
    "environment",
    "reporter",
    "category",
    "priority",
    "status",
    "assignedTeam",
    "assignedTo",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  updates.updatedAt = new Date();

  const [bug] = await db.update(bugs).set(updates).where(eq(bugs.id, id)).returning();
  if (!bug) return Response.json({ success: false, message: "Bug not found" }, { status: 404 });

  const triage = await latestTriageForBug(bug.id);
  return Response.json({ success: true, bug: serializeBug(bug, triage) });
}

async function updateBugStatus(id: string, req: Request) {
  const body = await req.json().catch(() => ({}));
  const { status } = body as Record<string, string>;
  if (!STATUSES.includes(status)) {
    return Response.json({ success: false, message: "Invalid status value" }, { status: 400 });
  }

  const [bug] = await db.update(bugs).set({ status, updatedAt: new Date() }).where(eq(bugs.id, id)).returning();
  if (!bug) return Response.json({ success: false, message: "Bug not found" }, { status: 404 });

  const triage = await latestTriageForBug(bug.id);
  return Response.json({ success: true, bug: serializeBug(bug, triage) });
}

async function deleteBug(id: string) {
  const [bug] = await db.delete(bugs).where(eq(bugs.id, id)).returning();
  if (!bug) return Response.json({ success: false, message: "Bug not found" }, { status: 404 });
  return Response.json({ success: true, message: "Bug deleted" });
}

async function getDashboardStats() {
  const allBugs = await db.select().from(bugs);

  const counters = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  };
  const byCategory = new Map<string, number>();
  const byPriority = new Map<string, number>();
  const byStatus = new Map<string, number>();

  for (const bug of allBugs) {
    if (bug.priority === "Critical") counters.critical++;
    else if (bug.priority === "High") counters.high++;
    else if (bug.priority === "Medium") counters.medium++;
    else if (bug.priority === "Low") counters.low++;

    if (bug.status === "Open") counters.open++;
    else if (bug.status === "In Progress") counters.inProgress++;
    else if (bug.status === "Resolved") counters.resolved++;
    else if (bug.status === "Closed") counters.closed++;

    const categoryLabel = bug.category || "Unclassified";
    byCategory.set(categoryLabel, (byCategory.get(categoryLabel) || 0) + 1);

    const priorityLabel = bug.priority || "Unclassified";
    byPriority.set(priorityLabel, (byPriority.get(priorityLabel) || 0) + 1);

    const statusLabel = bug.status || "Unknown";
    byStatus.set(statusLabel, (byStatus.get(statusLabel) || 0) + 1);
  }

  const toChartArray = (map: Map<string, number>) => Array.from(map.entries()).map(([label, count]) => ({ label, count }));

  return Response.json({
    success: true,
    stats: {
      totalBugs: allBugs.length,
      criticalBugs: counters.critical,
      highPriorityBugs: counters.high,
      mediumPriorityBugs: counters.medium,
      lowPriorityBugs: counters.low,
      openBugs: counters.open,
      inProgressBugs: counters.inProgress,
      resolvedBugs: counters.resolved,
      closedBugs: counters.closed,
    },
    charts: {
      byCategory: toChartArray(byCategory),
      byPriority: toChartArray(byPriority),
      byStatus: toChartArray(byStatus),
    },
  });
}
