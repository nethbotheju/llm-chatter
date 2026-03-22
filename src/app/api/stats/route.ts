import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  try {
    const [conversations, messages] = await Promise.all([
      prisma.conversation.count(),
      prisma.message.count(),
    ]);

    return NextResponse.json({
      conversations,
      messages,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
