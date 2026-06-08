import { getPrisma } from "./client";
import { seedDatabase } from "./seed";

export async function runMigrations() {
  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;
  await seedDatabase();
}
