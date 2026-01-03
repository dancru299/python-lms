import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const chapters = await prisma.chapter.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(chapters);
  } catch (error) {
    console.error("Get chapters error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
