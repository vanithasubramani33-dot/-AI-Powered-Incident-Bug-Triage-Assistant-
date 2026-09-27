import type { Config } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { generateToken, toSafeUser, ensureDemoUser } from "../lib/auth.js";

// POST /api/auth/login
export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.json().catch(() => ({}));
  const { email, password } = body as Record<string, string>;

  if (!email || !password) {
    return Response.json({ success: false, message: "Email and password are required" }, { status: 400 });
  }

  await ensureDemoUser();

  const normalizedEmail = email.toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (!user) {
    return Response.json({ success: false, message: "Invalid email or password" }, { status: 401 });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return Response.json({ success: false, message: "Invalid email or password" }, { status: 401 });
  }

  const token = generateToken(user.id);
  return Response.json({ success: true, token, user: toSafeUser(user) });
};

export const config: Config = {
  path: "/api/auth/login",
};
