import { db, seedDatabase } from "./index";

async function main() {
  console.log("Running Drizzle seeding...");
  await seedDatabase(db);
  console.log("Seeding complete!");
}

main().catch((err) => {
  console.error("Drizzle seeding failed:", err);
  process.exit(1);
});
