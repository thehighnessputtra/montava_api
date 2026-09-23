import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client.js";
import { wallets } from "../db/schema.js";

import type {
  CreateWalletInput,
  UpdateWalletInput,
} from "../schemas/wallet.js";

export async function getWallets(userId: string) {
  return db
    .select()
    .from(wallets)
    .where(
      and(
        eq(wallets.userId, userId),
        isNull(wallets.archivedAt),
      ),
    )
    .orderBy(wallets.createdAt);
}

export async function getWalletById(
  userId: string,
  walletId: string,
) {
  const result = await db
    .select()
    .from(wallets)
    .where(
      and(
        eq(wallets.id, walletId),
        eq(wallets.userId, userId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function createWallet(
  userId: string,
  input: CreateWalletInput,
) {
  const result = await db
    .insert(wallets)
    .values({
      userId,
      name: input.name,
      description: input.description ?? null,
      initialBalance: input.initialBalance,
      balance: input.initialBalance,
      currency: input.currency,
    })
    .returning();

  return result[0];
}

export async function updateWallet(
  userId: string,
  walletId: string,
  input: UpdateWalletInput,
) {
  const wallet = await getWalletById(userId, walletId);

  if (!wallet) {
    return null;
  }

  if (wallet.archivedAt) {
    throw new Error("WALLET_ARCHIVED");
  }

  const result = await db
    .update(wallets)
    .set({
      ...(input.name !== undefined
        ? { name: input.name }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(wallets.id, walletId),
        eq(wallets.userId, userId),
      ),
    )
    .returning();

  return result[0] ?? null;
}

export async function archiveWallet(
  userId: string,
  walletId: string,
) {
  const wallet = await getWalletById(userId, walletId);

  if (!wallet) {
    return null;
  }

  if (wallet.archivedAt) {
    throw new Error("WALLET_ALREADY_ARCHIVED");
  }

  if (wallet.balance !== 0) {
    throw new Error("WALLET_BALANCE_NOT_ZERO");
  }

  const result = await db
    .update(wallets)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(wallets.id, walletId),
        eq(wallets.userId, userId),
        isNull(wallets.archivedAt),
      ),
    )
    .returning();

  return result[0] ?? null;
}