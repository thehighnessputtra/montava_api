import { z } from "zod";

export const transactionTypeSchema = z.enum([
  "income",
  "expense",
  "transfer",
  "allocation",
  "goal_spending",
  "refund",
]);

export const transactionIdSchema = z.object({
  id: z.string().uuid(),
});

export const createTransactionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("income"),
    walletId: z.string().uuid(),
    amount: z.number().int().positive(),
    description: z.string().trim().max(1000).optional(),
    transactionDate: z.coerce.date(),
    categoryId: z.string().uuid().optional(),
    idempotencyKey: z.string().trim().min(1).max(255),
  }),

  z.object({
    type: z.literal("goal_spending"),
    walletId: z.string().uuid(),
    goalId: z.string().uuid(),
    amount: z.number().int().positive(),
    description: z.string().trim().max(1000).optional(),
    transactionDate: z.coerce.date(),
    categoryId: z.string().uuid(),
    idempotencyKey: z.string().trim().min(1).max(255),
  }),

  z.object({
    type: z.literal("expense"),
    walletId: z.string().uuid(),
    amount: z.number().int().positive(),
    description: z.string().trim().max(1000).optional(),
    transactionDate: z.coerce.date(),
    categoryId: z.string().uuid(),
    idempotencyKey: z.string().trim().min(1).max(255),
  }),

  z.object({
    type: z.literal("transfer"),
    fromWalletId: z.string().uuid(),
    toWalletId: z.string().uuid(),
    amount: z.number().int().positive(),
    description: z.string().trim().max(1000).optional(),
    transactionDate: z.coerce.date(),
    idempotencyKey: z.string().trim().min(1).max(255),
  }),

  z.object({
    type: z.literal("allocation"),
    fromWalletId: z.string().uuid(),
    goalId: z.string().uuid(),
    amount: z.number().int().positive(),
    description: z.string().trim().max(1000).optional(),
    transactionDate: z.coerce.date(),
    idempotencyKey: z.string().trim().min(1).max(255),
  }),

  z.object({
    type: z.literal("refund"),
    walletId: z.string().uuid(),
    goalId: z.string().uuid(),
    amount: z.number().int().positive(),
    description: z.string().optional(),
    transactionDate: z.coerce.date(),
    idempotencyKey: z.string().min(1).max(255),
  }),
]);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
