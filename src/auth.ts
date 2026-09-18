import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { db } from "./db/client.js";
import {
  users,
  sessions,
  accounts,
  verifications,
} from "./db/schema.js";
import { env } from "./config/env.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: false,
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
  },

  baseURL: env.BETTER_AUTH_URL,

  basePath: "/api/v1/auth",

  trustedOrigins: [env.CLIENT_ORIGIN],

  secret: env.BETTER_AUTH_SECRET,

  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});