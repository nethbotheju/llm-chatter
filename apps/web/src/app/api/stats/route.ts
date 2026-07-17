import { NextResponse } from "next/server";
import { db } from "@llm-chatter/db";
import { conversations, messages } from "@llm-chatter/db";
import { count } from "drizzle-orm";

export async function GET() {
  try {
    const [conversationsResult, messagesResult] = await Promise.all([
      db.select({ value: count() }).from(conversations).get(),
      db.select({ value: count() }).from(messages).get(),
    ]);

    return NextResponse.json({
      conversations: conversationsResult?.value ?? 0,
      messages: messagesResult?.value ?? 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
