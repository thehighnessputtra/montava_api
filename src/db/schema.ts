import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
  "allocation",
  "goal_spending",
  "refund",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "active",
  "cancelled",
]);

export const financialGoalStatusEnum = pgEnum("financial_goal_status", [
  "active",
  "completed",
  "cancelled",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),

  emailVerified: boolean("email_verified").notNull().default(false),
  image: varchar("image", { length: 500 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),

    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdIdx: index("session_user_id_idx").on(table.userId),
  }),
);

export const accounts = pgTable(
  "account",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),

    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),

    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),

    scope: text("scope"),
    password: text("password"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("account_user_id_idx").on(table.userId),
  }),
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),

    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  }),
);

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),

    initialBalance: integer("initial_balance").notNull().default(0),
    balance: integer("balance").notNull().default(0),

    currency: varchar("currency", { length: 3 }).notNull().default("IDR"),

    archivedAt: timestamp("archived_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("wallets_user_id_idx").on(table.userId),
  }),
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    name: varchar("name", { length: 100 }).notNull(),

    archivedAt: timestamp("archived_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("categories_user_id_idx").on(table.userId),
  }),
);

export const financialGoals = pgTable(
  "financial_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    name: varchar("name", { length: 120 }).notNull(),

    targetAmount: integer("target_amount").notNull().default(0),
    totalContributed: integer("total_contributed").notNull().default(0),
    allocatedAmount: integer("allocated_amount").notNull().default(0),
    spentAmount: integer("spent_amount").notNull().default(0),
    returnedAmount: integer("returned_amount").notNull().default(0),

    targetDate: timestamp("target_date"),

    status: financialGoalStatusEnum("status").notNull().default("active"),

    archivedAt: timestamp("archived_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("financial_goals_user_id_idx").on(table.userId),
  }),
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    type: transactionTypeEnum("type").notNull(),

    walletId: uuid("wallet_id").references(() => wallets.id),

    fromWalletId: uuid("from_wallet_id").references(() => wallets.id),

    toWalletId: uuid("to_wallet_id").references(() => wallets.id),

    goalId: uuid("goal_id").references(() => financialGoals.id),

    categoryId: uuid("category_id").references(() => categories.id),

    amount: integer("amount").notNull(),

    description: text("description"),

    transactionDate: timestamp("transaction_date").notNull(),

    status: transactionStatusEnum("status").notNull().default("active"),

    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("transactions_user_id_idx").on(table.userId),
    walletIdIdx: index("transactions_wallet_id_idx").on(table.walletId),
    fromWalletIdIdx: index("transactions_from_wallet_id_idx").on(
      table.fromWalletId,
    ),
    toWalletIdIdx: index("transactions_to_wallet_id_idx").on(table.toWalletId),
    goalIdIdx: index("transactions_goal_id_idx").on(table.goalId),
    categoryIdIdx: index("transactions_category_id_idx").on(table.categoryId),
    idempotencyKeyUniqueIdx: uniqueIndex(
      "transactions_user_idempotency_unique",
    ).on(table.userId, table.idempotencyKey),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  categories: many(categories),
  financialGoals: many(financialGoals),
  transactions: many(transactions),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),

  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),

  transactions: many(transactions),
}));

export const financialGoalsRelations = relations(
  financialGoals,
  ({ one, many }) => ({
    user: one(users, {
      fields: [financialGoals.userId],
      references: [users.id],
    }),

    transactions: many(transactions),
  }),
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),

  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),

  fromWallet: one(wallets, {
    fields: [transactions.fromWalletId],
    references: [wallets.id],
  }),

  toWallet: one(wallets, {
    fields: [transactions.toWalletId],
    references: [wallets.id],
  }),

  goal: one(financialGoals, {
    fields: [transactions.goalId],
    references: [financialGoals.id],
  }),

  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));
