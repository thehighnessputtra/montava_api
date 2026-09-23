ALTER TYPE "public"."goal_status" RENAME TO "financial_goal_status";--> statement-breakpoint
ALTER TABLE "financial_goals" DROP CONSTRAINT "financial_goals_target_positive";--> statement-breakpoint
ALTER TABLE "financial_goals" DROP CONSTRAINT "financial_goals_total_non_negative";--> statement-breakpoint
ALTER TABLE "financial_goals" DROP CONSTRAINT "financial_goals_allocated_non_negative";--> statement-breakpoint
ALTER TABLE "financial_goals" DROP CONSTRAINT "financial_goals_spent_non_negative";--> statement-breakpoint
ALTER TABLE "financial_goals" DROP CONSTRAINT "financial_goals_returned_non_negative";--> statement-breakpoint
ALTER TABLE "financial_goals" DROP CONSTRAINT "financial_goals_aggregate_consistent";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_amount_positive";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_transfer_wallets_distinct";--> statement-breakpoint
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_initial_balance_non_negative";--> statement-breakpoint
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_balance_non_negative";--> statement-breakpoint
DROP INDEX "categories_user_name_unique";--> statement-breakpoint
DROP INDEX "transactions_user_date_idx";--> statement-breakpoint
DROP INDEX "transactions_user_idempotency_unique";--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "archived_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "name" SET DATA TYPE varchar(120);--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "target_amount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "total_contributed" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "allocated_amount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "spent_amount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "returned_amount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "archived_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "idempotency_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "initial_balance" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "balance" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "archived_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_id_idempotency_key_unique" ON "transactions" USING btree ("user_id","idempotency_key");--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "description";