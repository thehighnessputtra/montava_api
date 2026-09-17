import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "completed",
  "cancelled",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 500 }),
    initialBalance: bigint("initial_balance", { mode: "number" }).notNull().default(0),
    balance: bigint("balance", { mode: "number" }).notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("IDR"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("wallets_user_id_idx").on(table.userId),
    check("wallets_initial_balance_non_negative", sql`${table.initialBalance} >= 0`),
    check("wallets_balance_non_negative", sql`${table.balance} >= 0`),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 500 }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("categories_user_name_unique").on(table.userId, table.name),
    index("categories_user_id_idx").on(table.userId),
  ],
);

export const financialGoals = pgTable(
  "financial_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    name: varchar("name", { length: 160 }).notNull(),
    targetAmount: bigint("target_amount", { mode: "number" }).notNull(),
    totalContributed: bigint("total_contributed", { mode: "number" }).notNull().default(0),
    allocatedAmount: bigint("allocated_amount", { mode: "number" }).notNull().default(0),
    spentAmount: bigint("spent_amount", { mode: "number" }).notNull().default(0),
    returnedAmount: bigint("returned_amount", { mode: "number" }).notNull().default(0),
    targetDate: timestamp("target_date", { withTimezone: false }),
    status: goalStatusEnum("status").notNull().default("active"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("financial_goals_user_id_idx").on(table.userId),
    check("financial_goals_target_positive", sql`${table.targetAmount} > 0`),
    check("financial_goals_total_non_negative", sql`${table.totalContributed} >= 0`),
    check("financial_goals_allocated_non_negative", sql`${table.allocatedAmount} >= 0`),
    check("financial_goals_spent_non_negative", sql`${table.spentAmount} >= 0`),
    check("financial_goals_returned_non_negative", sql`${table.returnedAmount} >= 0`),
    check(
      "financial_goals_aggregate_consistent",
      sql`${table.totalContributed} = ${table.allocatedAmount} + ${table.spentAmount} + ${table.returnedAmount}`,
    ),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    type: transactionTypeEnum("type").notNull(),
    walletId: uuid("wallet_id").references(() => wallets.id),
    fromWalletId: uuid("from_wallet_id").references(() => wallets.id),
    toWalletId: uuid("to_wallet_id").references(() => wallets.id),
    goalId: uuid("goal_id").references(() => financialGoals.id),
    categoryId: uuid("category_id").references(() => categories.id),
    amount: bigint("amount", { mode: "number" }).notNull(),
    description: varchar("description", { length: 500 }),
    transactionDate: timestamp("transaction_date", { withTimezone: false }).notNull(),
    status: transactionStatusEnum("status").notNull().default("active"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transactions_user_date_idx").on(table.userId, table.transactionDate),
    index("transactions_wallet_id_idx").on(table.walletId),
    index("transactions_from_wallet_id_idx").on(table.fromWalletId),
    index("transactions_to_wallet_id_idx").on(table.toWalletId),
    index("transactions_goal_id_idx").on(table.goalId),
    index("transactions_category_id_idx").on(table.categoryId),
    uniqueIndex("transactions_user_idempotency_unique").on(table.userId, table.idempotencyKey),
    check("transactions_amount_positive", sql`${table.amount} > 0`),
    check(
      "transactions_transfer_wallets_distinct",
      sql`${table.fromWalletId} IS NULL OR ${table.toWalletId} IS NULL OR ${table.fromWalletId} <> ${table.toWalletId}`,
    ),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  categories: many(categories),
  financialGoals: many(financialGoals),
  transactions: many(transactions),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  transactions: many(transactions, { relationName: "wallet" }),
  outgoingTransfers: many(transactions, { relationName: "fromWallet" }),
  incomingTransfers: many(transactions, { relationName: "toWallet" }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const financialGoalsRelations = relations(financialGoals, ({ one, many }) => ({
  user: one(users, { fields: [financialGoals.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
    relationName: "wallet",
  }),
  fromWallet: one(wallets, {
    fields: [transactions.fromWalletId],
    references: [wallets.id],
    relationName: "fromWallet",
  }),
  toWallet: one(wallets, {
    fields: [transactions.toWalletId],
    references: [wallets.id],
    relationName: "toWallet",
  }),
  goal: one(financialGoals, { fields: [transactions.goalId], references: [financialGoals.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
}));
