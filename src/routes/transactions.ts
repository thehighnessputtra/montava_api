import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/require-auth.js";
import {
  createTransactionSchema,
  transactionIdSchema,
} from "../schemas/transaction.js";
import {
  cancelTransaction,
  createAllocation,
  createGoalSpending,
  createTransaction,
  getTransactionById,
  getTransactions,
} from "../services/transactionService.js";

export async function transactionRoutes(app: FastifyInstance) {
  app.get("/api/v1/transactions", async (request) => {
    const session = await requireAuth(request);

    const result = await getTransactions(session.user.id);

    return {
      data: result,
    };
  });

  app.post("/api/v1/transactions/:id/cancel", async (request) => {
    const session = await requireAuth(request);
    const params = transactionIdSchema.parse(request.params);

    try {
      const result = await cancelTransaction(session.user.id, params.id);

      return {
        data: result,
      };
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      switch (error.message) {
        case "TRANSACTION_NOT_FOUND":
          throw app.httpErrors.notFound("Transaction not found");

        case "TRANSACTION_ALREADY_CANCELLED":
          throw app.httpErrors.badRequest("Transaction is already cancelled");

        case "WALLET_NOT_FOUND":
          throw app.httpErrors.badRequest(
            "Wallet is not available for transaction cancellation",
          );

        case "TRANSACTION_WALLET_NOT_FOUND":
          throw app.httpErrors.badRequest(
            "Transaction wallet reference is missing",
          );

        case "GOAL_NOT_FOUND":
          throw app.httpErrors.notFound("Financial goal not found");

        case "GOAL_NOT_ACTIVE":
          throw app.httpErrors.badRequest("Financial goal is not active");

        case "GOAL_ALLOCATED_AMOUNT_INVALID":
          throw app.httpErrors.badRequest("Goal allocated amount is invalid");

        case "GOAL_SPENT_AMOUNT_INVALID":
          throw app.httpErrors.badRequest("Goal spent amount is invalid");

        case "TRANSACTION_ALLOCATION_REFERENCE_NOT_FOUND":
          throw app.httpErrors.badRequest(
            "Allocation transaction reference is missing",
          );

        case "TRANSACTION_GOAL_SPENDING_REFERENCE_NOT_FOUND":
          throw app.httpErrors.badRequest(
            "Goal spending transaction reference is missing",
          );

        case "TRANSACTION_REFUND_REFERENCE_NOT_FOUND":
          throw app.httpErrors.badRequest(
            "Refund transaction reference is missing",
          );

        case "GOAL_RETURNED_AMOUNT_INVALID":
          throw app.httpErrors.badRequest("Goal returned amount is invalid");

        case "INSUFFICIENT_BALANCE":
          throw app.httpErrors.badRequest("Insufficient wallet balance");

        case "CATEGORY_NOT_FOUND":
          throw app.httpErrors.notFound("Category not found");

        default:
          throw error;
      }
    }
  });

  app.post("/api/v1/transactions", async (request, reply) => {
    const session = await requireAuth(request);
    const input = createTransactionSchema.parse(request.body);

    try {
      const result =
        input.type === "allocation"
          ? await createAllocation(session.user.id, input)
          : input.type === "goal_spending"
            ? await createGoalSpending(session.user.id, input)
            : await createTransaction(session.user.id, input);

      return reply.code(201).send({
        data: result,
      });
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      switch (error.message) {
        case "WALLET_NOT_FOUND":
          throw app.httpErrors.notFound("Wallet not found");

        case "GOAL_NOT_FOUND":
          throw app.httpErrors.notFound("Financial goal not found");

        case "GOAL_NOT_ACTIVE":
          throw app.httpErrors.badRequest("Financial goal is not active");

        case "GOAL_ALLOCATED_AMOUNT_INVALID":
          throw app.httpErrors.badRequest("Goal allocated amount is invalid");

        case "CATEGORY_NOT_FOUND":
          throw app.httpErrors.notFound("Category not found");

        case "INSUFFICIENT_BALANCE":
          throw app.httpErrors.badRequest("Insufficient wallet balance");

        case "TRANSFER_SAME_WALLET":
          throw app.httpErrors.badRequest(
            "Source and destination wallet must be different",
          );

        case "TRANSACTION_REFUND_REFERENCE_NOT_FOUND":
          throw app.httpErrors.badRequest(
            "Refund transaction reference is missing",
          );

        case "GOAL_RETURNED_AMOUNT_INVALID":
          throw app.httpErrors.badRequest("Goal returned amount is invalid");

        default:
          throw error;
      }
    }
  });

  app.get("/api/v1/transactions/:id", async (request) => {
    const session = await requireAuth(request);
    const params = transactionIdSchema.parse(request.params);

    const transaction = await getTransactionById(session.user.id, params.id);

    if (!transaction) {
      throw app.httpErrors.notFound("Transaction not found");
    }

    return {
      data: transaction,
    };
  });
}
