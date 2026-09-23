import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/require-auth.js";
import {
  categoryIdSchema,
  createCategorySchema,
  updateCategorySchema,
} from "../schemas/category.js";
import {
  archiveCategory,
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../services/categoryService.js";

export async function categoryRoutes(app: FastifyInstance) {
  app.get("/api/v1/categories", async (request) => {
    const session = await requireAuth(request);

    const result = await getCategories(session.user.id);

    return {
      data: result,
    };
  });

  app.get("/api/v1/categories/:id", async (request) => {
    const session = await requireAuth(request);
    const params = categoryIdSchema.parse(request.params);

    const category = await getCategoryById(
      session.user.id,
      params.id,
    );

    if (!category) {
      throw app.httpErrors.notFound("Category not found");
    }

    return {
      data: category,
    };
  });

  app.post("/api/v1/categories", async (request, reply) => {
    const session = await requireAuth(request);
    const input = createCategorySchema.parse(request.body);

    try {
      const category = await createCategory(
        session.user.id,
        input,
      );

      return reply.code(201).send({
        data: category,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "CATEGORY_ALREADY_EXISTS"
      ) {
        throw app.httpErrors.badRequest(
          "Category already exists",
        );
      }

      throw error;
    }
  });

  app.patch("/api/v1/categories/:id", async (request) => {
    const session = await requireAuth(request);
    const params = categoryIdSchema.parse(request.params);
    const input = updateCategorySchema.parse(request.body);

    try {
      const category = await updateCategory(
        session.user.id,
        params.id,
        input,
      );

      if (!category) {
        throw app.httpErrors.notFound("Category not found");
      }

      return {
        data: category,
      };
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      switch (error.message) {
        case "CATEGORY_ALREADY_EXISTS":
          throw app.httpErrors.badRequest(
            "Category already exists",
          );

        case "CATEGORY_ARCHIVED":
          throw app.httpErrors.badRequest(
            "Category is archived",
          );

        default:
          throw error;
      }
    }
  });

  app.post(
    "/api/v1/categories/:id/archive",
    async (request) => {
      const session = await requireAuth(request);
      const params = categoryIdSchema.parse(request.params);

      try {
        const category = await archiveCategory(
          session.user.id,
          params.id,
        );

        if (!category) {
          throw app.httpErrors.notFound(
            "Category not found",
          );
        }

        return {
          data: category,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "CATEGORY_ALREADY_ARCHIVED"
        ) {
          throw app.httpErrors.badRequest(
            "Category is already archived",
          );
        }

        throw error;
      }
    },
  );
}