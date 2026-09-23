import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { financialGoals, transactions, wallets } from "../db/schema.js";
import type {
  CancelFinancialGoalInput,
  CreateFinancialGoalInput,
  UpdateFinancialGoalInput,
} from "../schemas/financialGoal.js";

export async function getFinancialGoals(userId: string) {
  return db
    .select()
    .from(financialGoals)
    .where(
      and(eq(financialGoals.userId, userId), isNull(financialGoals.archivedAt)),
    )
    .orderBy(financialGoals.createdAt);
}

export async function getFinancialGoalById(userId: string, goalId: string) {
  const result = await db
    .select()
    .from(financialGoals)
    .where(
      and(eq(financialGoals.id, goalId), eq(financialGoals.userId, userId)),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function createFinancialGoal(
  userId: string,
  input: CreateFinancialGoalInput,
) {
  const result = await db
    .insert(financialGoals)
    .values({
      userId,
      name: input.name,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate ?? null,
    })
    .returning();

  return result[0];
}

export async function updateFinancialGoal(
  userId: string,
  goalId: string,
  input: UpdateFinancialGoalInput,
) {
  const goal = await getFinancialGoalById(userId, goalId);

  if (!goal) {
    return null;
  }

  if (goal.archivedAt) {
    throw new Error("GOAL_ARCHIVED");
  }

  if (goal.status !== "active") {
    throw new Error("GOAL_NOT_ACTIVE");
  }

  const result = await db
    .update(financialGoals)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.targetAmount !== undefined
        ? { targetAmount: input.targetAmount }
        : {}),
      ...(input.targetDate !== undefined
        ? { targetDate: input.targetDate }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(eq(financialGoals.id, goalId), eq(financialGoals.userId, userId)),
    )
    .returning();

  return result[0] ?? null;
}

export async function archiveFinancialGoal(userId: string, goalId: string) {
  const goal = await getFinancialGoalById(userId, goalId);

  if (!goal) {
    return null;
  }

  if (goal.archivedAt) {
    throw new Error("GOAL_ALREADY_ARCHIVED");
  }

  if (goal.allocatedAmount > 0) {
    throw new Error("GOAL_HAS_ALLOCATED_AMOUNT");
  }

  const result = await db
    .update(financialGoals)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(financialGoals.id, goalId),
        eq(financialGoals.userId, userId),
        isNull(financialGoals.archivedAt),
      ),
    )
    .returning();

  return result[0] ?? null;
}

export async function completeFinancialGoal(userId: string, goalId: string) {
  const goal = await getFinancialGoalById(userId, goalId);

  if (!goal) {
    return null;
  }

  if (goal.archivedAt) {
    throw new Error("GOAL_ARCHIVED");
  }

  if (goal.status !== "active") {
    throw new Error("GOAL_NOT_ACTIVE");
  }

  if (goal.allocatedAmount > 0) {
    throw new Error("GOAL_HAS_ALLOCATED_AMOUNT");
  }

  const result = await db
    .update(financialGoals)
    .set({
      status: "completed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(financialGoals.id, goalId),
        eq(financialGoals.userId, userId),
        eq(financialGoals.status, "active"),
        isNull(financialGoals.archivedAt),
      ),
    )
    .returning();

  return result[0] ?? null;
}

export async function cancelFinancialGoal(
  userId: string,
  goalId: string,
  input: CancelFinancialGoalInput,
) {
  return db.transaction(async (tx) => {
    const goalResult = await tx
      .select()
      .from(financialGoals)
      .where(
        and(eq(financialGoals.id, goalId), eq(financialGoals.userId, userId)),
      )
      .for("update");

    const goal = goalResult[0];

    if (!goal) {
      return null;
    }

    if (goal.archivedAt) {
      throw new Error("GOAL_ARCHIVED");
    }

    if (goal.status !== "active") {
      throw new Error("GOAL_NOT_ACTIVE");
    }

    const allocatedAmount = goal.allocatedAmount;

    if (allocatedAmount === 0) {
      const result = await tx
        .update(financialGoals)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(financialGoals.id, goalId),
            eq(financialGoals.userId, userId),
            eq(financialGoals.status, "active"),
            isNull(financialGoals.archivedAt),
          ),
        )
        .returning();

      return result[0] ?? null;
    }

    if (!input.walletId) {
      throw new Error("REFUND_WALLET_REQUIRED");
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

    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${allocatedAmount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(wallets.id, input.walletId),
          eq(wallets.userId, userId),
          isNull(wallets.archivedAt),
        ),
      );

    await tx.insert(transactions).values({
      userId,
      type: "refund",
      walletId: input.walletId,
      goalId,
      amount: allocatedAmount,
      description: "Refund financial goal cancellation",
      transactionDate: new Date(),
      status: "active",
      idempotencyKey: `goal-cancel-refund:${goalId}`,
    });

    const result = await tx
      .update(financialGoals)
      .set({
        allocatedAmount: 0,
        returnedAmount: sql`${financialGoals.returnedAmount} + ${allocatedAmount}`,
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financialGoals.id, goalId),
          eq(financialGoals.userId, userId),
          eq(financialGoals.status, "active"),
          isNull(financialGoals.archivedAt),
        ),
      )
      .returning();

    return result[0] ?? null;
  });
}
