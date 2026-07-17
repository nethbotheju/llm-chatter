import { getDb } from "./client";
import { seedDatabase as seedDb } from "@llm-chatter/db";

export async function seedDatabase() {
  await seedDb(getDb());
}
