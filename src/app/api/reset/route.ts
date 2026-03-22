import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function POST() {
  try {
    // Delete all data in correct order (respecting foreign keys)
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.model.deleteMany();
    await prisma.assistant.deleteMany();
    await prisma.provider.deleteMany();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset application" },
      { status: 500 }
    );
  }
}
