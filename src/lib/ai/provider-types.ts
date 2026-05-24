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
