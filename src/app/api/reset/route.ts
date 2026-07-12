import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { messages, conversations, models, assistants, providers } from "@/lib/db/schema";

export async function POST() {
  try {
    // Delete all data in correct order (respecting foreign keys)
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(models);
    await db.delete(assistants);
    await db.delete(providers);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset application" },
      { status: 500 }
    );
  }
}
