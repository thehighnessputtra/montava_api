import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { categories } from "../db/schema.js";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../schemas/category.js";

export async function getCategories(userId: string) {
  return db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        isNull(categories.archivedAt),
      ),
    )
    .orderBy(categories.createdAt);
}

export async function getCategoryById(
  userId: string,
  categoryId: string,
) {
  const result = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
) {
  const existingCategory = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.name, input.name),
        isNull(categories.archivedAt),
      ),
    )
    .limit(1);

  if (existingCategory[0]) {
    throw new Error("CATEGORY_ALREADY_EXISTS");
  }

  const result = await db
    .insert(categories)
    .values({
      userId,
      name: input.name,
    })
    .returning();

  return result[0];
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  const category = await getCategoryById(userId, categoryId);

  if (!category) {
    return null;
  }

  if (category.archivedAt) {
    throw new Error("CATEGORY_ARCHIVED");
  }

  const existingCategory = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.name, input.name),
        isNull(categories.archivedAt),
      ),
    )
    .limit(1);

  if (
    existingCategory[0] &&
    existingCategory[0].id !== categoryId
  ) {
    throw new Error("CATEGORY_ALREADY_EXISTS");
  }

  const result = await db
    .update(categories)
    .set({
      name: input.name,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId),
      ),
    )
    .returning();

  return result[0] ?? null;
}

export async function archiveCategory(
  userId: string,
  categoryId: string,
) {
  const category = await getCategoryById(userId, categoryId);

  if (!category) {
    return null;
  }

  if (category.archivedAt) {
    throw new Error("CATEGORY_ALREADY_ARCHIVED");
  }

  const result = await db
    .update(categories)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId),
        isNull(categories.archivedAt),
      ),
    )
    .returning();

  return result[0] ?? null;
}