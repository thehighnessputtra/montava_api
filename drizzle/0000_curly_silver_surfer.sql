CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('active', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'transfer', 'allocation', 'goal_spending', 'refund');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(500),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"target_amount" bigint NOT NULL,
	"total_contributed" bigint DEFAULT 0 NOT NULL,
	"allocated_amount" bigint DEFAULT 0 NOT NULL,
	"spent_amount" bigint DEFAULT 0 NOT NULL,
	"returned_amount" bigint DEFAULT 0 NOT NULL,
	"target_date" timestamp,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_goals_target_positive" CHECK ("financial_goals"."target_amount" > 0),
	CONSTRAINT "financial_goals_total_non_negative" CHECK ("financial_goals"."total_contributed" >= 0),
	CONSTRAINT "financial_goals_allocated_non_negative" CHECK ("financial_goals"."allocated_amount" >= 0),
	CONSTRAINT "financial_goals_spent_non_negative" CHECK ("financial_goals"."spent_amount" >= 0),
	CONSTRAINT "financial_goals_returned_non_negative" CHECK ("financial_goals"."returned_amount" >= 0),
	CONSTRAINT "financial_goals_aggregate_consistent" CHECK ("financial_goals"."total_contributed" = "financial_goals"."allocated_amount" + "financial_goals"."spent_amount" + "financial_goals"."returned_amount")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"wallet_id" uuid,
	"from_wallet_id" uuid,
	"to_wallet_id" uuid,
	"goal_id" uuid,
	"category_id" uuid,
	"amount" bigint NOT NULL,
	"description" varchar(500),
	"transaction_date" timestamp NOT NULL,
	"status" "transaction_status" DEFAULT 'active' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_positive" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "transactions_transfer_wallets_distinct" CHECK ("transactions"."from_wallet_id" IS NULL OR "transactions"."to_wallet_id" IS NULL OR "transactions"."from_wallet_id" <> "transactions"."to_wallet_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(500),
	"initial_balance" bigint DEFAULT 0 NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'IDR' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_initial_balance_non_negative" CHECK ("wallets"."initial_balance" >= 0),
	CONSTRAINT "wallets_balance_non_negative" CHECK ("wallets"."balance" >= 0)
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_wallet_id_wallets_id_fk" FOREIGN KEY ("from_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_wallet_id_wallets_id_fk" FOREIGN KEY ("to_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_goal_id_financial_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."financial_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_unique" ON "categories" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "financial_goals_user_id_idx" ON "financial_goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_wallet_id_idx" ON "transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "transactions_from_wallet_id_idx" ON "transactions" USING btree ("from_wallet_id");--> statement-breakpoint
CREATE INDEX "transactions_to_wallet_id_idx" ON "transactions" USING btree ("to_wallet_id");--> statement-breakpoint
CREATE INDEX "transactions_goal_id_idx" ON "transactions" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_idempotency_unique" ON "transactions" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "wallets_user_id_idx" ON "wallets" USING btree ("user_id");