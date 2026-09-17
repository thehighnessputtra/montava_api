import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(helmet);
  app.register(cors, { origin: true });
  app.register(sensible);

  app.get("/health", async () => ({
    data: {
      status: "ok",
      service: "montava-api",
    },
  }));

  return app;
}
