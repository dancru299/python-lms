export const LESSON_AI_PROVIDERS = [
  "gemini",
  "openai",
  "openrouter",
  "groq",
  "deepseek",
  "qwen",
] as const;

export type LessonAiProvider = (typeof LESSON_AI_PROVIDERS)[number];

export interface LessonAiProviderOption {
  value: LessonAiProvider;
  label: string;
  description: string;
  configured: boolean;
  defaultModel: string;
}

export interface LessonAiClientConfig {
  defaultProvider: LessonAiProvider;
  providers: LessonAiProviderOption[];
}

export function isLessonAiProvider(value: string): value is LessonAiProvider {
  return (LESSON_AI_PROVIDERS as readonly string[]).includes(value);
}

// Ngữ cảnh sư phạm tuỳ chọn cho luồng sinh bài: giúp AI viết đúng đối tượng &
// phong cách thay vì giọng trung lập, khô khan.
export const LESSON_AUDIENCES = ["grade6_7", "grade8_9"] as const;
export type LessonAudience = (typeof LESSON_AUDIENCES)[number];

export const LESSON_TEACHING_STYLES = ["gamified", "project", "concise"] as const;
export type LessonTeachingStyle = (typeof LESSON_TEACHING_STYLES)[number];

export interface LessonGenerationContext {
  audience?: LessonAudience;
  style?: LessonTeachingStyle;
}

// Lọc input client thành context hợp lệ (bỏ giá trị lạ) để dùng an toàn ở server.
export function normalizeLessonGenerationContext(
  value: unknown
): LessonGenerationContext | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const audience = (LESSON_AUDIENCES as readonly string[]).includes(
    source.audience as string
  )
    ? (source.audience as LessonAudience)
    : undefined;
  const style = (LESSON_TEACHING_STYLES as readonly string[]).includes(
    source.style as string
  )
    ? (source.style as LessonTeachingStyle)
    : undefined;
  if (!audience && !style) return undefined;
  return { audience, style };
}
