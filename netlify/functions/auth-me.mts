import type { Config } from "@netlify/functions";
import { requireUser, toSafeUser, AuthError } from "../lib/auth.js";

// GET /api/auth/me
export default async (req: Request) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  try {
    const user = await requireUser(req);
    return Response.json({ success: true, user: toSafeUser(user) });
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ success: false, message: err.message }, { status: err.status });
    }
    throw err;
  }
};

export const config: Config = {
  path: "/api/auth/me",
};
