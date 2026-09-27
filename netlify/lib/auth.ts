import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

const DEMO_EMAIL = "admin@triage.com";
const DEMO_PASSWORD = "admin123";

// The app ships with documented demo credentials (admin@triage.com /
// admin123). On a fresh database there's no seed step in the Netlify
// deploy pipeline, so we lazily create the demo account on first login
// attempt instead, matching the original app's documented behavior.
export async function ensureDemoUser() {
  const [existing] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing) return;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db.insert(users).values({
    name: "Admin User",
    email: DEMO_EMAIL,
    passwordHash,
    role: "admin",
  });
}

export function generateToken(userId: string): string {
  const secret = Netlify.env.get("JWT_SECRET");
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ id: userId }, secret, {
    expiresIn: Netlify.env.get("JWT_EXPIRES_IN") || "7d",
  } as jwt.SignOptions);
}

export function toSafeUser(user: typeof users.$inferSelect) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

// Verifies the bearer token on a request and loads the current user.
// Throws AuthError (401) if missing/invalid - callers should catch and
// return a JSON 401 response.
export async function requireUser(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new AuthError("Not authorized, no token provided");

  const secret = Netlify.env.get("JWT_SECRET");
  if (!secret) throw new AuthError("Server misconfigured: missing JWT secret", 500);

  let decoded: { id: string };
  try {
    decoded = jwt.verify(token, secret) as { id: string };
  } catch {
    throw new AuthError("Not authorized, invalid or expired token");
  }

  const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
  if (!user) throw new AuthError("User no longer exists");

  return user;
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}
