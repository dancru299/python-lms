import { NextRequest, NextResponse } from "next/server";
import { generateAiJsonObject } from "@/lib/ai/lesson-generation";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  createCurriculumDraftFromOutline,
  normalizeCurriculumDraft,
  outlineToPromptText,
  type EbookOutlineItem,
} from "@/lib/programs/ebook-curriculum";

// AI outline generation can take up to ~55s; allow the Vercel function the full Hobby cap.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const body = await request.json();
    const outline = Array.isArray(body.outline)
      ? (body.outline as EbookOutlineItem[])
      : [];
    const programTitle =
      typeof body.programTitle === "string" && body.programTitle.trim()
        ? body.programTitle.trim()
        : "Chuong trinh Python tu ebook";

    if (outline.length === 0) {
      return NextResponse.json(
        { error: "Outline la bat buoc de tao goi y." },
        { status: 400 }
      );
    }

    const fallbackDraft = createCurriculumDraftFromOutline(outline, programTitle);

    try {
      const result = await generateAiJsonObject({
        provider: body.provider,
        model: body.model,
        systemPrompt: [
          "You are a senior curriculum designer for a Vietnamese Python LMS.",
          "Return exactly one valid JSON object, no markdown.",
          "Design a practical training program from an ebook table of contents.",
          "Milestones are learning stages, not just database records.",
          "Outcomes must describe what students can do after a milestone.",
          "Skills must be a capability tree, not a copy of the table of contents.",
          "All user-facing text must be Vietnamese.",
        ].join("\n"),
        userPrompt: [
          "Return JSON with this exact shape:",
          "{",
          '  "programTitle": "string",',
          '  "programDescription": "string",',
          '  "chapters": [{ "key": "chapter-1", "title": "string", "sortOrder": 0 }],',
          '  "lessons": [{ "key": "lesson-1-1", "chapterKey": "chapter-1", "title": "string", "sourceNumber": "1.1", "sourcePage": 9, "duration": 60, "difficulty": "beginner" }],',
          '  "milestones": [{ "key": "milestone-1", "title": "string", "description": "string", "lessonKeys": ["lesson-1-1"] }],',
          '  "outcomes": [{ "key": "outcome-1", "milestoneKey": "milestone-1", "title": "string", "description": "string", "lessonKeys": ["lesson-1-1"] }],',
          '  "skills": [{ "key": "skill-1", "parentKey": "", "title": "string", "description": "string", "outcomeKeys": ["outcome-1"] }]',
          "}",
          "",
          "Rules:",
          "- Keep keys stable and only reference keys that exist.",
          "- Create one chapter and one milestone per ebook chapter unless two small chapters should clearly merge.",
          "- Create one placeholder lesson per numbered section or exercise item.",
          "- Lesson difficulty must be beginner, intermediate, or advanced.",
          "- Use 45-90 minute durations.",
          "- Create 1-3 outcomes per milestone.",
          "- Outcomes must be measurable: use action verbs such as viết được, tạo được, giải thích được, áp dụng được, hoàn thành được, debug được.",
          "- Avoid vague outcomes such as chỉ 'hiểu', 'biết', 'nắm được' unless paired with an observable product or task.",
          "- Every outcome must reference the lessonKeys that prove it.",
          "- Every outcome must be mapped to at least one skill via skill.outcomeKeys.",
          "- Every milestone should have a clear description and at least one outcome.",
          "- Include practice/application coverage when the ebook has exercises, practice sections, or project-like items.",
          "- Create skill root groups such as Moi truong lap trinh, Cu phap Python co ban, Tu duy giai bai, instead of copying every lesson title.",
          "- Skills should be durable capabilities, not section titles. Prefer groups like Môi trường lập trình, Cú pháp Python cơ bản, Tư duy giải bài, Làm việc với dữ liệu, Debug và kiểm thử.",
          "",
          "Ebook outline:",
          outlineToPromptText(outline),
        ].join("\n"),
      });

      return NextResponse.json({
        draft: normalizeCurriculumDraft(result.json as object, fallbackDraft),
        meta: {
          source: "ai",
          ...result.meta,
        },
      });
    } catch (aiError) {
      return NextResponse.json({
        draft: fallbackDraft,
        meta: {
          source: "fallback",
          warning:
            aiError instanceof Error
              ? aiError.message
              : "AI provider khong kha dung, da dung ban goi y mac dinh.",
        },
      });
    }
  } catch (error) {
    console.error("Generate ebook curriculum error:", error);
    return NextResponse.json(
      { error: "Khong the tao goi y curriculum." },
      { status: 500 }
    );
  }
}
