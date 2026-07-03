import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { parseAppConfigSet } from "@/lib/contracts";

export async function GET() {
  const rows = await prisma.appConfig.findMany();
  const map: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      map[row.key] = JSON.parse(row.value);
    } catch {
      map[row.key] = row.value;
    }
  }
  return NextResponse.json(map);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = parseAppConfigSet(body);

    await prisma.appConfig.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AppConfig set error:", error);
    return NextResponse.json(
      { error: "Failed to set config" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Key is required" }, { status: 400 });
  }
  await prisma.appConfig.deleteMany({ where: { key } });
  return NextResponse.json({ success: true });
}
