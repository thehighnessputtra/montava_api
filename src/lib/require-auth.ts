import type { FastifyRequest } from "fastify";

import { getAuthSession } from "./auth-session.js";

export async function requireAuth(request: FastifyRequest) {
  const session = await getAuthSession(request);

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}