import { sql } from "drizzle-orm";
import { db } from "./client.js";

export async function checkDatabaseConnection() {
  await db.execute(sql`SELECT 1`);
}