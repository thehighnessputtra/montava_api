import type { FastifyInstance } from "fastify";

import { requireAuth } from "../lib/require-auth.js";
import {
  createWalletSchema,
  updateWalletSchema,
  walletIdSchema,
} from "../schemas/wallet.js";

import {
  archiveWallet,
  createWallet,
  getWalletById,
  getWallets,
  updateWallet,
} from "../services/walletService.js";

export async function walletRoutes(app: FastifyInstance) {
  app.get("/api/v1/wallets", async (request) => {
    const session = await requireAuth(request);

    const result = await getWallets(session.user.id);

    return {
      data: result,
    };
  });

  app.get("/api/v1/wallets/:id", async (request) => {
    const session = await requireAuth(request);

    const params = walletIdSchema.parse(request.params);

    const wallet = await getWalletById(session.user.id, params.id);

    if (!wallet) {
      throw app.httpErrors.notFound("Wallet not found");
    }

    return {
      data: wallet,
    };
  });

  app.post("/api/v1/wallets", async (request, reply) => {
    const session = await requireAuth(request);

    const input = createWalletSchema.parse(request.body);

    const wallet = await createWallet(session.user.id, input);

    return reply.code(201).send({
      data: wallet,
    });
  });

  app.patch("/api/v1/wallets/:id", async (request) => {
    const session = await requireAuth(request);
    const params = walletIdSchema.parse(request.params);
    const input = updateWalletSchema.parse(request.body);

    const wallet = await updateWallet(session.user.id, params.id, input);

    if (!wallet) {
      throw app.httpErrors.notFound("Wallet not found");
    }

    return { data: wallet };
  });

  app.post("/api/v1/wallets/:id/archive", async (request) => {
  const session = await requireAuth(request);
  const params = walletIdSchema.parse(request.params);

  try {
    const wallet = await archiveWallet(session.user.id, params.id);

    if (!wallet) {
      throw app.httpErrors.notFound("Wallet not found");
    }

    return { data: wallet };
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "WALLET_ALREADY_ARCHIVED":
          throw app.httpErrors.badRequest("Wallet is already archived");

        case "WALLET_BALANCE_NOT_ZERO":
          throw app.httpErrors.badRequest(
            "Wallet balance must be zero before archiving",
          );
      }
    }

    throw error;
  }
});
}
