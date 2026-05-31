import { NextResponse } from "next/server";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import { generateAutoArrangeSuggestion } from "@/lib/programs/auto-arrange";

// AI arrangement can take up to ~55s; allow the Vercel function the full Hobby cap.
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId } = await params;
    const result = await generateAutoArrangeSuggestion(programId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Auto-arrange suggestion error:", error);
    const message = error instanceof Error ? error.message : "Đã xảy ra lỗi khi tạo gợi ý";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
