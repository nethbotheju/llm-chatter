import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { messages, conversations } from "@/lib/db/schema";
import { like, desc, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const matchedMessages = await db.select()
      .from(messages)
      .where(like(messages.parts, `%${query}%`))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    if (matchedMessages.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const conversationIds = [...new Set(matchedMessages.map((m) => m.conversationId))];
    const matchingConversations = await db.select({
      id: conversations.id,
      title: conversations.title,
    })
    .from(conversations)
    .where(inArray(conversations.id, conversationIds));

    const convMap = new Map(matchingConversations.map((c) => [c.id, c]));

    const results = matchedMessages.map((msg) => ({
      conversationId: msg.conversationId,
      conversationTitle: convMap.get(msg.conversationId)?.title || "Untitled",
      messageId: msg.id,
      snippet: getSnippet(msg.parts, query, 150),
      createdAt: typeof msg.createdAt === "string" ? msg.createdAt : new Date(msg.createdAt).toISOString(),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}

function getSnippet(parts: string, query: string, length: number): string {
  const lowerParts = parts.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerParts.indexOf(lowerQuery);

  if (idx === -1) {
    return parts.slice(0, length) + (parts.length > length ? "..." : "");
  }

  const start = Math.max(0, idx - Math.floor(length / 2));
  const end = Math.min(parts.length, idx + query.length + Math.floor(length / 2));

  let snippet = parts.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < parts.length) snippet = snippet + "...";

  return snippet;
}
