import type { FastifyInstance } from "fastify";

import { auth } from "../auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.route({
    method: ["GET", "POST"],
    url: "/api/v1/auth/*",
    handler: async (request, reply) => {
      const url = new URL(
        request.url,
        `${request.protocol}://${request.hostname}`,
      );

      const headers = new Headers();

      for (const [key, value] of Object.entries(request.headers)) {
        if (value === undefined) continue;

        if (Array.isArray(value)) {
          for (const item of value) {
            headers.append(key, item);
          }
        } else {
          headers.set(key, value);
        }
      }

      let body: unknown;

      if (request.method !== "GET" && request.method !== "HEAD") {
        body = request.body;
      }

      const requestInit: RequestInit = {
        method: request.method,
        headers,
      };

      if (body !== undefined) {
        requestInit.body = JSON.stringify(body);
      }

      const webRequest = new Request(url, requestInit);

      const response = await auth.handler(webRequest);

      reply.status(response.status);

      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      return response.text();
    },
  });
}