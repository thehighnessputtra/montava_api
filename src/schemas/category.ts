import { z } from "zod";

export const categoryIdSchema = z.object({
  id: z.string().uuid(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;