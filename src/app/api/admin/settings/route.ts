import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/api-auth";

export async function GET() {
  try {
    const { response } = await requireAdminSessionJson();
    if (response) return response;

    const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { response } = await requireAdminSessionJson();
    if (response) return response;

    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await Promise.all(
      body.map(({ key, value }: { key: string; value: string }) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
