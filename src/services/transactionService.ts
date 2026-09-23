import {
  and,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";
import { db } from "../db/client.js";
import { transactions, wallets } from "../db/schema.js";
import type { CreateTransactionInput } from "../schemas/transaction.js";

export async function getTransactions(userId: string) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(transactions.transactionDate);
}

export async function getTransactionById(
  userId: string,
  transactionId: string,
) {
  const result = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.userId, userId)),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function cancelTransaction(userId: string, transactionId: string) {
  return db.transaction(async (tx) => {
    const transactionResult = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId),
        ),
      )
      .limit(1);

    const transaction = transactionResult[0];

    if (!transaction) {
      throw new Error("TRANSACTION_NOT_FOUND");
    }

    if (transaction.status === "cancelled") {
      throw new Error("TRANSACTION_ALREADY_CANCELLED");
    }

    switch (transaction.type) {
      case "income": {
        if (!transaction.walletId) {
          throw new Error("TRANSACTION_WALLET_NOT_FOUND");
        }

        const walletResult = await tx
          .select()
          .from(wallets)
          .where(
            and(
              eq(wallets.id, transaction.walletId),
              eq(wallets.userId, userId),
              isNull(wallets.archivedAt),
            ),
          )
          .for("update");

        const wallet = walletResult[0];

        if (!wallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: wallet.balance - transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        const updatedTransaction = await tx
          .update(transactions)
          .set({
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, transaction.id))
          .returning();

        return {
          transaction: updatedTransaction[0],
          wallet: updatedWallet[0],
        };
      }

      case "expense": {
        if (!transaction.walletId) {
          throw new Error("TRANSACTION_WALLET_NOT_FOUND");
        }

        const walletResult = await tx
          .select()
          .from(wallets)
          .where(
            and(
              eq(wallets.id, transaction.walletId),
              eq(wallets.userId, userId),
              isNull(wallets.archivedAt),
            ),
          )
          .for("update");

        const wallet = walletResult[0];

        if (!wallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: wallet.balance + transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        const updatedTransaction = await tx
          .update(transactions)
          .set({
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, transaction.id))
          .returning();

        return {
          transaction: updatedTransaction[0],
          wallet: updatedWallet[0],
        };
      }

      case "transfer": {
        if (!transaction.fromWalletId || !transaction.toWalletId) {
          throw new Error("TRANSACTION_WALLET_NOT_FOUND");
        }

        const walletIds = [
          transaction.fromWalletId,
          transaction.toWalletId,
        ].sort();

        const walletResult = await tx
          .select()
          .from(wallets)
          .where(
            and(
              eq(wallets.userId, userId),
              inArray(wallets.id, walletIds),
              isNull(wallets.archivedAt),
            ),
          )
          .orderBy(wallets.id)
          .for("update");

        const fromWallet = walletResult.find(
          (wallet) => wallet.id === transaction.fromWalletId,
        );

        const toWallet = walletResult.find(
          (wallet) => wallet.id === transaction.toWalletId,
        );

        if (!fromWallet || !toWallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const updatedFromWallet = await tx
          .update(wallets)
          .set({
            balance: fromWallet.balance + transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, fromWallet.id))
          .returning();

        const updatedToWallet = await tx
          .update(wallets)
          .set({
            balance: toWallet.balance - transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, toWallet.id))
          .returning();

        const updatedTransaction = await tx
          .update(transactions)
          .set({
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, transaction.id))
          .returning();

        return {
          transaction: updatedTransaction[0],
          fromWallet: updatedFromWallet[0],
          toWallet: updatedToWallet[0],
        };
      }
    }
  });
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
) {
  return db.transaction(async (tx) => {
    const existingTransaction = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);

    if (existingTransaction[0]) {
      return {
        transaction: existingTransaction[0],
      };
    }

    switch (input.type) {
      case "income": {
        const walletResult = await tx
          .select()
          .from(wallets)
          .where(
            and(
              eq(wallets.id, input.walletId),
              eq(wallets.userId, userId),
              isNull(wallets.archivedAt),
            ),
          )
          .for("update");

        const wallet = walletResult[0];

        if (!wallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const newBalance = wallet.balance + input.amount;

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: newBalance,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        const transactionResult = await tx
          .insert(transactions)
          .values({
            userId,
            type: "income",
            walletId: wallet.id,
            amount: input.amount,
            description: input.description ?? null,
            transactionDate: input.transactionDate,
            categoryId: input.categoryId ?? null,
            idempotencyKey: input.idempotencyKey,
          })
          .returning();

        return {
          transaction: transactionResult[0],
          wallet: updatedWallet[0],
        };
      }

      case "expense": {
        const walletResult = await tx
          .select()
          .from(wallets)
          .where(
            and(
              eq(wallets.id, input.walletId),
              eq(wallets.userId, userId),
              isNull(wallets.archivedAt),
            ),
          )
          .for("update");

        const wallet = walletResult[0];

        if (!wallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        if (wallet.balance < input.amount) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const newBalance = wallet.balance - input.amount;

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: newBalance,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        const transactionResult = await tx
          .insert(transactions)
          .values({
            userId,
            type: "expense",
            walletId: wallet.id,
            amount: input.amount,
            description: input.description ?? null,
            transactionDate: input.transactionDate,
            categoryId: input.categoryId,
            idempotencyKey: input.idempotencyKey,
          })
          .returning();

        return {
          transaction: transactionResult[0],
          wallet: updatedWallet[0],
        };
      }

      case "transfer": {
        if (input.fromWalletId === input.toWalletId) {
          throw new Error("TRANSFER_SAME_WALLET");
        }

        const walletIds = [input.fromWalletId, input.toWalletId].sort();

        const walletResult = await tx
          .select()
          .from(wallets)
          .where(
            and(
              eq(wallets.userId, userId),
              inArray(wallets.id, walletIds),
              isNull(wallets.archivedAt),
            ),
          )
          .orderBy(wallets.id)
          .for("update");

        const fromWallet = walletResult.find(
          (wallet) => wallet.id === input.fromWalletId,
        );

        const toWallet = walletResult.find(
          (wallet) => wallet.id === input.toWalletId,
        );

        if (!fromWallet || !toWallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        if (fromWallet.balance < input.amount) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const updatedFromWallet = await tx
          .update(wallets)
          .set({
            balance: fromWallet.balance - input.amount,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, fromWallet.id))
          .returning();

        const updatedToWallet = await tx
          .update(wallets)
          .set({
            balance: toWallet.balance + input.amount,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, toWallet.id))
          .returning();

        const transactionResult = await tx
          .insert(transactions)
          .values({
            userId,
            type: "transfer",
            fromWalletId: fromWallet.id,
            toWalletId: toWallet.id,
            amount: input.amount,
            description: input.description ?? null,
            transactionDate: input.transactionDate,
            idempotencyKey: input.idempotencyKey,
          })
          .returning();

        return {
          transaction: transactionResult[0],
          fromWallet: updatedFromWallet[0],
          toWallet: updatedToWallet[0],
        };
      }
    }
  });
}
