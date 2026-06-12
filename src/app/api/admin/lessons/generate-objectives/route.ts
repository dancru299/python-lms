import { NextResponse } from "next/server";
import { generateLessonObjectives } from "@/lib/ai/lesson-generation";
import { buildAiErrorResponse } from "@/lib/ai/ai-error";
import { requireTeacher } from "@/lib/session";

// Objective generation is a short, bounded call.
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    await requireTeacher();

    const { content, title, provider, model } = await req.json();
    const safeContent = typeof content === "string" ? content.trim() : "";
    const safeTitle = typeof title === "string" ? title.trim() : "";

    if (!safeContent && !safeTitle) {
      return NextResponse.json(
        { error: "Cần có nội dung hoặc tiêu đề để tạo mục tiêu bài giảng." },
        { status: 400 }
      );
    }

    const { objectives, meta } = await generateLessonObjectives({
      content: safeContent || safeTitle,
      title: safeTitle,
      provider,
      model,
    });

    return NextResponse.json({ objectives, meta });
  } catch (error: unknown) {
    console.error("Lesson objectives generation error:", error);
    return buildAiErrorResponse(error);
  }
}
