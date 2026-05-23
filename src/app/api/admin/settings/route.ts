import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await (prisma as any).setting.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json(settings);
  } catch (error: any) {
    if (error?.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await Promise.all(
      body.map(({ key, value }: { key: string; value: string }) =>
        (prisma as any).setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
