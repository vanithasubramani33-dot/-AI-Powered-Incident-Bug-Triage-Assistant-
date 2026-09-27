import type { Config } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { generateToken, toSafeUser } from "../lib/auth.js";

// POST /api/auth/register - helper for creating additional accounts
export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.json().catch(() => ({}));
  const { name, email, password, role } = body as Record<string, string>;

  if (!name || !email || !password) {
    return Response.json({ success: false, message: "name, email and password are required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing) {
    return Response.json({ success: false, message: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ name, email: normalizedEmail, passwordHash, role: role || "developer" })
    .returning();

  const token = generateToken(user.id);
  return Response.json({ success: true, token, user: toSafeUser(user) }, { status: 201 });
};

export const config: Config = {
  path: "/api/auth/register",
};
