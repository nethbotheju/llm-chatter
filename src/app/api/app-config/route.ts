import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { appConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseAppConfigSet } from "@/lib/contracts";

export async function GET() {
  const rows = await db.select().from(appConfig);
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

    const now = new Date().toISOString();
    await db.insert(appConfig)
      .values({
        key,
        value: JSON.stringify(value),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: appConfig.key,
        set: {
          value: JSON.stringify(value),
          updatedAt: now,
        },
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
  await db.delete(appConfig).where(eq(appConfig.key, key));
  return NextResponse.json({ success: true });
}
