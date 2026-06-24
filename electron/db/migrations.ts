import { runEmbeddedMigrations } from "./migrator";
import { seedDatabase } from "./seed";

export async function runMigrations() {
  await runEmbeddedMigrations();
  await seedDatabase();
}
