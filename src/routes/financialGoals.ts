import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/require-auth.js";
import {
  createFinancialGoalSchema,
  financialGoalIdSchema,
  updateFinancialGoalSchema,
  cancelFinancialGoalSchema,
} from "../schemas/financialGoal.js";
import {
  archiveFinancialGoal,
  completeFinancialGoal,
  createFinancialGoal,
  getFinancialGoalById,
  cancelFinancialGoal,
  getFinancialGoals,
  updateFinancialGoal,
} from "../services/financialGoalService.js";

export async function financialGoalRoutes(app: FastifyInstance) {
  app.get("/api/v1/financial-goals", async (request) => {
    const session = await requireAuth(request);

    const result = await getFinancialGoals(session.user.id);

    return {
      data: result,
    };
  });

  app.post("/api/v1/financial-goals/:id/complete", async (request) => {
    const session = await requireAuth(request);
    const params = financialGoalIdSchema.parse(request.params);

    try {
      const goal = await completeFinancialGoal(session.user.id, params.id);

      if (!goal) {
        throw app.httpErrors.notFound("Financial goal not found");
      }

      return {
        data: goal,
      };
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      switch (error.message) {
        case "GOAL_ARCHIVED":
          throw app.httpErrors.badRequest("Financial goal is archived");

        case "GOAL_NOT_ACTIVE":
          throw app.httpErrors.badRequest("Financial goal is not active");

        case "GOAL_HAS_ALLOCATED_AMOUNT":
          throw app.httpErrors.badRequest(
            "Financial goal still has allocated amount",
          );

        default:
          throw error;
      }
    }
  });

  app.post("/api/v1/financial-goals/:id/cancel", async (request) => {
    const session = await requireAuth(request);
    const params = financialGoalIdSchema.parse(request.params);
    const input = cancelFinancialGoalSchema.parse(request.body ?? {});

    try {
      const goal = await cancelFinancialGoal(session.user.id, params.id, input);

      if (!goal) {
        throw app.httpErrors.notFound("Financial goal not found");
      }

      return {
        data: goal,
      };
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      switch (error.message) {
        case "GOAL_ARCHIVED":
          throw app.httpErrors.badRequest("Financial goal is archived");

        case "GOAL_NOT_ACTIVE":
          throw app.httpErrors.badRequest("Financial goal is not active");

        case "REFUND_WALLET_REQUIRED":
          throw app.httpErrors.badRequest(
            "Wallet is required to return allocated amount",
          );

        case "WALLET_NOT_FOUND":
          throw app.httpErrors.notFound("Wallet not found");

        default:
          throw error;
      }
    }
  });

  app.get("/api/v1/financial-goals/:id", async (request) => {
    const session = await requireAuth(request);
    const params = financialGoalIdSchema.parse(request.params);

    const goal = await getFinancialGoalById(session.user.id, params.id);

    if (!goal) {
      throw app.httpErrors.notFound("Financial goal not found");
    }

    return {
      data: goal,
    };
  });

  app.post("/api/v1/financial-goals", async (request, reply) => {
    const session = await requireAuth(request);
    const input = createFinancialGoalSchema.parse(request.body);

    const goal = await createFinancialGoal(session.user.id, input);

    return reply.code(201).send({
      data: goal,
    });
  });

  app.patch("/api/v1/financial-goals/:id", async (request) => {
    const session = await requireAuth(request);
    const params = financialGoalIdSchema.parse(request.params);
    const input = updateFinancialGoalSchema.parse(request.body);

    try {
      const goal = await updateFinancialGoal(session.user.id, params.id, input);

      if (!goal) {
        throw app.httpErrors.notFound("Financial goal not found");
      }

      return {
        data: goal,
      };
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      switch (error.message) {
        case "GOAL_ARCHIVED":
          throw app.httpErrors.badRequest("Financial goal is archived");

        case "GOAL_NOT_ACTIVE":
          throw app.httpErrors.badRequest("Financial goal is not active");

        default:
          throw error;
      }
    }
  });

  app.post("/api/v1/financial-goals/:id/archive", async (request) => {
    const session = await requireAuth(request);
    const params = financialGoalIdSchema.parse(request.params);

    try {
      const goal = await archiveFinancialGoal(session.user.id, params.id);

      if (!goal) {
        throw app.httpErrors.notFound("Financial goal not found");
      }

      return {
        data: goal,
      };
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      switch (error.message) {
        case "GOAL_ALREADY_ARCHIVED":
          throw app.httpErrors.badRequest("Financial goal is already archived");

        case "GOAL_HAS_ALLOCATED_AMOUNT":
          throw app.httpErrors.badRequest(
            "Financial goal still has allocated amount",
          );

        default:
          throw error;
      }
    }
  });
}
