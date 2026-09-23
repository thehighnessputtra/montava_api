import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";

import { requireAuth } from "./lib/require-auth.js";
import { checkDatabaseConnection } from "./db/health.js";
import { authRoutes } from "./routes/auth.js";
import { walletRoutes } from "./routes/wallets.js";
import { transactionRoutes } from "./routes/transactions.js";
import { categoryRoutes } from "./routes/categories.js";
import { financialGoalRoutes } from "./routes/financialGoals.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(helmet);

  app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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

  app.get("/api/v1/me", async (request) => {
    const session = await requireAuth(request);

    return {
      data: {
        user: session.user,
      },
    };
  });

  app.register(authRoutes);
  app.register(walletRoutes);
  app.register(transactionRoutes);
  app.register(categoryRoutes);
  app.register(financialGoalRoutes);

  return app;
}
