import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        parts: {
          contains: query,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const conversationIds = [...new Set(messages.map((m) => m.conversationId))];
    const conversations = await prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      select: { id: true, title: true },
    });
    const convMap = new Map(conversations.map((c) => [c.id, c]));

    const results = messages.map((msg) => ({
      conversationId: msg.conversationId,
      conversationTitle: convMap.get(msg.conversationId)?.title || "Untitled",
      messageId: msg.id,
      snippet: getSnippet(msg.parts, query, 150),
      createdAt: msg.createdAt.toISOString(),
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
