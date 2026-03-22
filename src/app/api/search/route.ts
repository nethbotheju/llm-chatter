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
        content: {
          contains: query,
        },
      },
      include: {
        conversation: {
          select: { id: true, title: true },
        },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    const results = messages.map((msg) => ({
      conversationId: msg.conversation.id,
      conversationTitle: msg.conversation.title || "Untitled",
      messageId: msg.id,
      snippet: getSnippet(msg.content, query, 150),
      createdAt: msg.createdAt.toISOString(),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}

function getSnippet(content: string, query: string, length: number): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerContent.indexOf(lowerQuery);

  if (idx === -1) {
    return content.slice(0, length) + (content.length > length ? "..." : "");
  }

  const start = Math.max(0, idx - Math.floor(length / 2));
  const end = Math.min(content.length, idx + query.length + Math.floor(length / 2));

  let snippet = content.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet;
}
