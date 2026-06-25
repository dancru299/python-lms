import { NextResponse } from "next/server";
import { generateSectionCanvas } from "@/lib/ai/lesson-generation";
import { buildAiErrorResponse } from "@/lib/ai/ai-error";
import { normalizeLessonGenerationContext } from "@/lib/ai/provider-types";
import { requireTeacher } from "@/lib/session";

// One tab → canvas is a small, bounded call; stay within the Vercel Hobby cap.
export const maxDuration = 60;

// POST - Beautify a SINGLE pre-split lesson tab into teaching-canvas blocks.
// The client (template hybrid flow) calls this once per tab so the AI can only
// enrich a tab's content, never re-split or merge the teacher's tabs.
export async function POST(req: Request) {
  try {
    await requireTeacher();

    const {
      title,
      content,
      lessonTitle,
      isFirst,
      layoutHints,
      roleHint,
      provider,
      model,
      context,
    } = await req.json();

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Nội dung tab là bắt buộc." },
        { status: 400 }
      );
    }

    const { contentBlocks, meta } = await generateSectionCanvas({
      title: typeof title === "string" ? title : "",
      content,
      lessonTitle: typeof lessonTitle === "string" ? lessonTitle : undefined,
      isFirst: isFirst === true,
      layoutHints: Array.isArray(layoutHints)
        ? layoutHints.filter((hint): hint is string => typeof hint === "string")
        : undefined,
      roleHint: typeof roleHint === "string" ? roleHint : undefined,
      provider,
      model,
      context: normalizeLessonGenerationContext(context),
    });

    return NextResponse.json({ contentBlocks, meta });
  } catch (error: unknown) {
    console.error("Section canvas generation error:", error);
    return buildAiErrorResponse(error);
  }
}
