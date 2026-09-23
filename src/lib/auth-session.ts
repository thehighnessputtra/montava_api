import type { FastifyRequest } from "fastify";

import { auth } from "../auth.js";

export async function getAuthSession(request: FastifyRequest) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else {
      headers.set(key, value);
    }
  }

  return auth.api.getSession({
    headers,
  });
}