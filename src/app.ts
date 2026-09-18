import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";

import { checkDatabaseConnection } from "./db/health.js";
import { authRoutes } from "./routes/auth.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(helmet);

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.register(sensible);

  app.get("/health", async () => ({
    data: {
      status: "ok",
      service: "montava-api",
    },
  }));

  app.get("/api/v1/health/db", async () => {
    await checkDatabaseConnection();

    return {
      data: {
        status: "ok",
        database: "connected",
      },
    };
  });

  app.register(authRoutes);

  return app;
}