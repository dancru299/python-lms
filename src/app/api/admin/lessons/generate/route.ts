import { NextResponse } from "next/server";
import { generateLessonDraft } from "@/lib/ai/lesson-generation";
import {
  type LessonAiProvider,
  isLessonAiProvider,
} from "@/lib/ai/provider-types";
import { requireTeacher } from "@/lib/session";

const PROVIDER_LABELS: Record<LessonAiProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  groq: "Groq",
  deepseek: "DeepSeek",
  qwen: "Qwen / DashScope",
};

function getErrorStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return 500;
}

function getErrorProvider(error: unknown): LessonAiProvider | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "provider" in error &&
    typeof (error as { provider?: unknown }).provider === "string"
  ) {
    const provider = (error as { provider: string }).provider;
    return isLessonAiProvider(provider) ? provider : null;
  }

  return null;
}

function getPublicErrorMessage(
  status: number,
  details: string,
  provider: LessonAiProvider | null
): string {
  const providerLabel = provider ? PROVIDER_LABELS[provider] : "Provider AI";

  if (
    details.includes("API key") ||
    details.includes("base URL") ||
    details.includes("chưa được cấu hình")
  ) {
    return `${providerLabel} chưa được cấu hình đầy đủ.`;
  }

  switch (status) {
    case 400:
      return `Yêu cầu gửi tới ${providerLabel} không hợp lệ.`;
    case 401:
      return `API key của ${providerLabel} không hợp lệ hoặc đã hết hiệu lực.`;
    case 403:
      return `Tài khoản hiện không có quyền dùng model này trên ${providerLabel}.`;
    case 404:
      return `Model AI không tồn tại hoặc chưa khả dụng trên ${providerLabel}.`;
    case 429:
      return `${providerLabel} đang hết quota hoặc đã chạm giới hạn tạm thời.`;
    default:
      return "Không thể tạo bản nháp bài giảng bằng AI.";
  }
}

export async function POST(req: Request) {
  try {
    await requireTeacher();

    const { content, provider, model } = await req.json();

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Nội dung nguồn là bắt buộc." },
        { status: 400 }
      );
    }

    const { draft, meta } = await generateLessonDraft({
      content,
      provider,
      model,
    });

    return NextResponse.json({
      ...draft,
      meta,
    });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : "Unknown error";
    const status = getErrorStatus(error);
    const provider = getErrorProvider(error);
    console.error("Lesson generation error:", error);

    return NextResponse.json(
      {
        error: getPublicErrorMessage(status, details, provider),
        details,
        provider,
      },
      { status }
    );
  }
}
