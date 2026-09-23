import { z } from "zod";
import { financialGoals, transactions, wallets } from "../db/schema.js";

export const financialGoalIdSchema = z.object({
  id: z.string().uuid(),
});

export const createFinancialGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmount: z.number().int().positive(),
  targetDate: z.coerce.date().optional(),
});

export const updateFinancialGoalSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  targetAmount: z.number().int().positive().optional(),
  targetDate: z.coerce.date().nullable().optional(),
});

export const cancelFinancialGoalSchema = z.object({
  walletId: z.string().uuid().optional(),
});

export type CancelFinancialGoalInput = z.infer<
  typeof cancelFinancialGoalSchema
>;

export type CreateFinancialGoalInput = z.infer<
  typeof createFinancialGoalSchema
>;

export type UpdateFinancialGoalInput = z.infer<
  typeof updateFinancialGoalSchema
>;
