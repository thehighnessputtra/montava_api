import { z } from "zod";

export const createWalletSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  initialBalance: z.number().int().min(0),
  currency: z.string().length(3).default("IDR"),
});

export const updateWalletSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const walletIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;