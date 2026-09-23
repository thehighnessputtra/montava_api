import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  categories,
  financialGoals,
  transactions,
  wallets,
} from "../db/schema.js";
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

        if (wallet.balance < transaction.amount) {
          throw new Error("INSUFFICIENT_BALANCE");
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

      case "refund": {
        if (!transaction.walletId || !transaction.goalId) {
          throw new Error("TRANSACTION_REFUND_REFERENCE_NOT_FOUND");
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

        if (wallet.balance < transaction.amount) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const goalResult = await tx
          .select()
          .from(financialGoals)
          .where(
            and(
              eq(financialGoals.id, transaction.goalId),
              eq(financialGoals.userId, userId),
              isNull(financialGoals.archivedAt),
            ),
          )
          .for("update");

        const goal = goalResult[0];

        if (!goal) {
          throw new Error("GOAL_NOT_FOUND");
        }

        if (goal.status !== "active") {
          throw new Error("GOAL_NOT_ACTIVE");
        }

        if (goal.returnedAmount < transaction.amount) {
          throw new Error("GOAL_RETURNED_AMOUNT_INVALID");
        }

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: wallet.balance - transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        const updatedGoal = await tx
          .update(financialGoals)
          .set({
            allocatedAmount: goal.allocatedAmount + transaction.amount,
            returnedAmount: goal.returnedAmount - transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(financialGoals.id, goal.id))
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
          goal: updatedGoal[0],
        };
      }

      case "allocation": {
        if (!transaction.fromWalletId || !transaction.goalId) {
          throw new Error("TRANSACTION_ALLOCATION_REFERENCE_NOT_FOUND");
        }

        const walletResult = await tx
          .select()
          .from(wallets)
          .where(
            and(
              eq(wallets.id, transaction.fromWalletId),
              eq(wallets.userId, userId),
              isNull(wallets.archivedAt),
            ),
          )
          .for("update");

        const wallet = walletResult[0];

        if (!wallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const goalResult = await tx
          .select()
          .from(financialGoals)
          .where(
            and(
              eq(financialGoals.id, transaction.goalId),
              eq(financialGoals.userId, userId),
              isNull(financialGoals.archivedAt),
            ),
          )
          .for("update");

        const goal = goalResult[0];

        if (!goal) {
          throw new Error("GOAL_NOT_FOUND");
        }

        if (goal.status !== "active") {
          throw new Error("GOAL_NOT_ACTIVE");
        }

        if (goal.allocatedAmount < transaction.amount) {
          throw new Error("GOAL_ALLOCATED_AMOUNT_INVALID");
        }

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: wallet.balance + transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        const updatedGoal = await tx
          .update(financialGoals)
          .set({
            totalContributed: goal.totalContributed - transaction.amount,
            allocatedAmount: goal.allocatedAmount - transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(financialGoals.id, goal.id))
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
          goal: updatedGoal[0],
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

      case "goal_spending": {
        if (!transaction.walletId || !transaction.goalId) {
          throw new Error("TRANSACTION_GOAL_SPENDING_REFERENCE_NOT_FOUND");
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

        const goalResult = await tx
          .select()
          .from(financialGoals)
          .where(
            and(
              eq(financialGoals.id, transaction.goalId),
              eq(financialGoals.userId, userId),
              isNull(financialGoals.archivedAt),
            ),
          )
          .for("update");

        const goal = goalResult[0];

        if (!goal) {
          throw new Error("GOAL_NOT_FOUND");
        }

        if (goal.status !== "active") {
          throw new Error("GOAL_NOT_ACTIVE");
        }

        if (goal.spentAmount < transaction.amount) {
          throw new Error("GOAL_SPENT_AMOUNT_INVALID");
        }

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: wallet.balance + transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        const updatedGoal = await tx
          .update(financialGoals)
          .set({
            allocatedAmount: goal.allocatedAmount + transaction.amount,
            spentAmount: goal.spentAmount - transaction.amount,
            updatedAt: new Date(),
          })
          .where(eq(financialGoals.id, goal.id))
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
          goal: updatedGoal[0],
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

        if (toWallet.balance < transaction.amount) {
          throw new Error("INSUFFICIENT_BALANCE");
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

async function getExistingTransaction(
  tx: typeof db,
  userId: string,
  idempotencyKey: string,
) {
  const result = await tx
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  return result[0];
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
) {
  return db.transaction(async (tx) => {
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
          .limit(1);

        if (!walletResult[0]) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const transactionResult = await tx
          .insert(transactions)
          .values({
            userId,
            type: "income",
            walletId: input.walletId,
            amount: input.amount,
            description: input.description ?? null,
            transactionDate: input.transactionDate,
            categoryId: input.categoryId ?? null,
            idempotencyKey: input.idempotencyKey,
          })
          .onConflictDoNothing({
            target: [transactions.userId, transactions.idempotencyKey],
          })
          .returning();

        if (!transactionResult[0]) {
          const existing = await tx
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.idempotencyKey, input.idempotencyKey),
              ),
            )
            .limit(1);

          if (!existing[0]) {
            throw new Error("IDEMPOTENCY_TRANSACTION_NOT_FOUND");
          }

          return { transaction: existing[0] };
        }

        const walletResultLocked = await tx
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

        const wallet = walletResultLocked[0];

        if (!wallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${input.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        return {
          transaction: transactionResult[0],
          wallet: updatedWallet[0],
        };
      }

      case "expense": {
        const walletExists = await tx
          .select({ id: wallets.id })
          .from(wallets)
          .where(
            and(
              eq(wallets.id, input.walletId),
              eq(wallets.userId, userId),
              isNull(wallets.archivedAt),
            ),
          )
          .limit(1);

        if (!walletExists[0]) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const categoryResult = await tx
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.id, input.categoryId),
              eq(categories.userId, userId),
              isNull(categories.archivedAt),
            ),
          )
          .limit(1);

        const category = categoryResult[0];

        if (!category) {
          throw new Error("CATEGORY_NOT_FOUND");
        }

        const transactionResult = await tx
          .insert(transactions)
          .values({
            userId,
            type: "expense",
            walletId: input.walletId,
            amount: input.amount,
            description: input.description ?? null,
            transactionDate: input.transactionDate,
            categoryId: category.id,
            idempotencyKey: input.idempotencyKey,
          })
          .onConflictDoNothing({
            target: [transactions.userId, transactions.idempotencyKey],
          })
          .returning();

        if (!transactionResult[0]) {
          const existing = await tx
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.idempotencyKey, input.idempotencyKey),
              ),
            )
            .limit(1);

          if (!existing[0]) {
            throw new Error("IDEMPOTENCY_TRANSACTION_NOT_FOUND");
          }

          return { transaction: existing[0] };
        }

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

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} - ${input.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        return {
          transaction: transactionResult[0],
          wallet: updatedWallet[0],
        };
      }

      case "refund": {
        const walletExists = await tx
          .select({ id: wallets.id })
          .from(wallets)
          .where(
            and(
              eq(wallets.id, input.walletId),
              eq(wallets.userId, userId),
              isNull(wallets.archivedAt),
            ),
          )
          .limit(1);

        if (!walletExists[0]) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const goalExists = await tx
          .select({ id: financialGoals.id })
          .from(financialGoals)
          .where(
            and(
              eq(financialGoals.id, input.goalId),
              eq(financialGoals.userId, userId),
              isNull(financialGoals.archivedAt),
            ),
          )
          .limit(1);

        if (!goalExists[0]) {
          throw new Error("GOAL_NOT_FOUND");
        }

        const transactionResult = await tx
          .insert(transactions)
          .values({
            userId,
            type: "refund",
            walletId: input.walletId,
            goalId: input.goalId,
            amount: input.amount,
            description: input.description ?? null,
            transactionDate: input.transactionDate,
            idempotencyKey: input.idempotencyKey,
          })
          .onConflictDoNothing({
            target: [transactions.userId, transactions.idempotencyKey],
          })
          .returning();

        if (!transactionResult[0]) {
          const existing = await tx
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.idempotencyKey, input.idempotencyKey),
              ),
            )
            .limit(1);

          if (!existing[0]) {
            throw new Error("IDEMPOTENCY_TRANSACTION_NOT_FOUND");
          }

          return { transaction: existing[0] };
        }

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

        const goalResult = await tx
          .select()
          .from(financialGoals)
          .where(
            and(
              eq(financialGoals.id, input.goalId),
              eq(financialGoals.userId, userId),
              isNull(financialGoals.archivedAt),
            ),
          )
          .for("update");

        const goal = goalResult[0];

        if (!goal) {
          throw new Error("GOAL_NOT_FOUND");
        }

        if (goal.status !== "active") {
          throw new Error("GOAL_NOT_ACTIVE");
        }

        if (goal.allocatedAmount < input.amount) {
          throw new Error("GOAL_ALLOCATED_AMOUNT_INVALID");
        }

        const updatedWallet = await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${input.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();

        const updatedGoal = await tx
          .update(financialGoals)
          .set({
            allocatedAmount: sql`${financialGoals.allocatedAmount} - ${input.amount}`,
            returnedAmount: sql`${financialGoals.returnedAmount} + ${input.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(financialGoals.id, goal.id))
          .returning();

        return {
          transaction: transactionResult[0],
          wallet: updatedWallet[0],
          goal: updatedGoal[0],
        };
      }

      case "transfer": {
        if (input.fromWalletId === input.toWalletId) {
          throw new Error("TRANSFER_SAME_WALLET");
        }

        const walletExists = await tx
          .select({ id: wallets.id })
          .from(wallets)
          .where(
            and(
              eq(wallets.userId, userId),
              inArray(wallets.id, [input.fromWalletId, input.toWalletId]),
              isNull(wallets.archivedAt),
            ),
          );

        if (walletExists.length !== 2) {
          throw new Error("WALLET_NOT_FOUND");
        }

        const transactionResult = await tx
          .insert(transactions)
          .values({
            userId,
            type: "transfer",
            fromWalletId: input.fromWalletId,
            toWalletId: input.toWalletId,
            amount: input.amount,
            description: input.description ?? null,
            transactionDate: input.transactionDate,
            idempotencyKey: input.idempotencyKey,
          })
          .onConflictDoNothing({
            target: [transactions.userId, transactions.idempotencyKey],
          })
          .returning();

        if (!transactionResult[0]) {
          const existing = await tx
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.idempotencyKey, input.idempotencyKey),
              ),
            )
            .limit(1);

          if (!existing[0]) {
            throw new Error("IDEMPOTENCY_TRANSACTION_NOT_FOUND");
          }

          return { transaction: existing[0] };
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
            balance: sql`${wallets.balance} - ${input.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, fromWallet.id))
          .returning();

        const updatedToWallet = await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${input.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, toWallet.id))
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

export async function createGoalSpending(
  userId: string,
  input: Extract<CreateTransactionInput, { type: "goal_spending" }>,
) {
  return db.transaction(async (tx) => {
    const walletExists = await tx
      .select({ id: wallets.id })
      .from(wallets)
      .where(
        and(
          eq(wallets.id, input.walletId),
          eq(wallets.userId, userId),
          isNull(wallets.archivedAt),
        ),
      )
      .limit(1);

    if (!walletExists[0]) {
      throw new Error("WALLET_NOT_FOUND");
    }

    const goalExists = await tx
      .select({ id: financialGoals.id })
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.id, input.goalId),
          eq(financialGoals.userId, userId),
          isNull(financialGoals.archivedAt),
        ),
      )
      .limit(1);

    if (!goalExists[0]) {
      throw new Error("GOAL_NOT_FOUND");
    }

    const categoryResult = await tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, input.categoryId),
          eq(categories.userId, userId),
          isNull(categories.archivedAt),
        ),
      )
      .limit(1);

    const category = categoryResult[0];

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    const transactionResult = await tx
      .insert(transactions)
      .values({
        userId,
        type: "goal_spending",
        walletId: input.walletId,
        goalId: input.goalId,
        categoryId: category.id,
        amount: input.amount,
        description: input.description ?? null,
        transactionDate: input.transactionDate,
        idempotencyKey: input.idempotencyKey,
      })
      .onConflictDoNothing({
        target: [transactions.userId, transactions.idempotencyKey],
      })
      .returning();

    if (!transactionResult[0]) {
      const existing = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);

      if (!existing[0]) {
        throw new Error("IDEMPOTENCY_TRANSACTION_NOT_FOUND");
      }

      return { transaction: existing[0] };
    }

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

    const goalResult = await tx
      .select()
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.id, input.goalId),
          eq(financialGoals.userId, userId),
          isNull(financialGoals.archivedAt),
        ),
      )
      .for("update");

    const goal = goalResult[0];

    if (!goal) {
      throw new Error("GOAL_NOT_FOUND");
    }

    if (goal.status !== "active") {
      throw new Error("GOAL_NOT_ACTIVE");
    }

    if (goal.allocatedAmount < input.amount) {
      throw new Error("GOAL_ALLOCATED_AMOUNT_INVALID");
    }

    const updatedWallet = await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id))
      .returning();

    const updatedGoal = await tx
      .update(financialGoals)
      .set({
        allocatedAmount: sql`${financialGoals.allocatedAmount} - ${input.amount}`,
        spentAmount: sql`${financialGoals.spentAmount} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(financialGoals.id, goal.id))
      .returning();

    return {
      transaction: transactionResult[0],
      wallet: updatedWallet[0],
      goal: updatedGoal[0],
    };
  });
}

export async function createAllocation(
  userId: string,
  input: Extract<CreateTransactionInput, { type: "allocation" }>,
) {
  return db.transaction(async (tx) => {
    const walletExists = await tx
      .select({ id: wallets.id })
      .from(wallets)
      .where(
        and(
          eq(wallets.id, input.fromWalletId),
          eq(wallets.userId, userId),
          isNull(wallets.archivedAt),
        ),
      )
      .limit(1);

    if (!walletExists[0]) {
      throw new Error("WALLET_NOT_FOUND");
    }

    const goalExists = await tx
      .select({ id: financialGoals.id })
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.id, input.goalId),
          eq(financialGoals.userId, userId),
          isNull(financialGoals.archivedAt),
        ),
      )
      .limit(1);

    if (!goalExists[0]) {
      throw new Error("GOAL_NOT_FOUND");
    }

    const transactionResult = await tx
      .insert(transactions)
      .values({
        userId,
        type: "allocation",
        fromWalletId: input.fromWalletId,
        goalId: input.goalId,
        amount: input.amount,
        description: input.description ?? null,
        transactionDate: input.transactionDate,
        idempotencyKey: input.idempotencyKey,
      })
      .onConflictDoNothing({
        target: [transactions.userId, transactions.idempotencyKey],
      })
      .returning();

    if (!transactionResult[0]) {
      const existing = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);

      if (!existing[0]) {
        throw new Error("IDEMPOTENCY_TRANSACTION_NOT_FOUND");
      }

      return { transaction: existing[0] };
    }

    const walletResult = await tx
      .select()
      .from(wallets)
      .where(
        and(
          eq(wallets.id, input.fromWalletId),
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

    const goalResult = await tx
      .select()
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.id, input.goalId),
          eq(financialGoals.userId, userId),
          isNull(financialGoals.archivedAt),
        ),
      )
      .for("update");

    const goal = goalResult[0];

    if (!goal) {
      throw new Error("GOAL_NOT_FOUND");
    }

    if (goal.status !== "active") {
      throw new Error("GOAL_NOT_ACTIVE");
    }

    const updatedWallet = await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id))
      .returning();

    const updatedGoal = await tx
      .update(financialGoals)
      .set({
        totalContributed: sql`${financialGoals.totalContributed} + ${input.amount}`,
        allocatedAmount: sql`${financialGoals.allocatedAmount} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(financialGoals.id, goal.id))
      .returning();

    return {
      transaction: transactionResult[0],
      wallet: updatedWallet[0],
      goal: updatedGoal[0],
    };
  });
}

