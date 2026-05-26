import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type LessonAiClientConfig,
  type LessonAiProvider,
  type LessonAiProviderOption,
  isLessonAiProvider,
} from "@/lib/ai/provider-types";
import {
  normalizeLessonDraft,
  type LessonDraft,
} from "@/lib/lessons/lesson-draft";

interface LessonGenerationSelection {
  provider: LessonAiProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

interface LessonGenerationResult {
  draft: LessonDraft;
  meta: {
    provider: LessonAiProvider;
    model: string;
  };
}

interface ModelTextResult {
  model: string;
  text: string;
}

interface ProviderDefinition {
  label: string;
  description: string;
  defaultModel: string;
  modelEnvNames: string[];
  apiKeyEnvNames: string[];
  baseUrl?: string;
  baseUrlEnvNames?: string[];
  kind: "gemini" | "openai-compatible";
}

class ProviderRequestError extends Error {
  status: number;
  provider: LessonAiProvider;

  constructor(message: string, status: number, provider: LessonAiProvider) {
    super(message);
    this.name = "ProviderRequestError";
    this.status = status;
    this.provider = provider;
  }
}

const PROVIDERS: Record<LessonAiProvider, ProviderDefinition> = {
  gemini: {
    label: "Google Gemini",
    description: "Nhanh, dễ setup, phù hợp khi cần dùng Google AI Studio.",
    defaultModel: "gemini-2.5-flash",
    modelEnvNames: ["AI_GEMINI_MODEL", "GEMINI_MODEL"],
    apiKeyEnvNames: ["GEMINI_API_KEY"],
    kind: "gemini",
  },
  openai: {
    label: "OpenAI",
    description: "Ổn định cho JSON output và chất lượng biên tập bài giảng cao.",
    defaultModel: "gpt-5.2",
    modelEnvNames: ["AI_OPENAI_MODEL", "OPENAI_MODEL", "AI_DEFAULT_MODEL"],
    apiKeyEnvNames: ["OPENAI_API_KEY"],
    baseUrl: "https://api.openai.com/v1",
    kind: "openai-compatible",
  },
  openrouter: {
    label: "OpenRouter",
    description: "Một API nhưng đổi được nhiều model thương mại và open-weight.",
    defaultModel: "openai/gpt-5.2",
    modelEnvNames: [
      "AI_OPENROUTER_MODEL",
      "OPENROUTER_MODEL",
      "AI_DEFAULT_MODEL",
    ],
    apiKeyEnvNames: ["OPENROUTER_API_KEY"],
    baseUrl: "https://openrouter.ai/api/v1",
    kind: "openai-compatible",
  },
  groq: {
    label: "Groq",
    description: "Rất nhanh với các model open-weight mạnh, hợp tác vụ draft nhanh.",
    defaultModel: "openai/gpt-oss-120b",
    modelEnvNames: ["AI_GROQ_MODEL", "GROQ_MODEL", "AI_DEFAULT_MODEL"],
    apiKeyEnvNames: ["GROQ_API_KEY"],
    baseUrl: "https://api.groq.com/openai/v1",
    kind: "openai-compatible",
  },
  deepseek: {
    label: "DeepSeek",
    description: "Mạnh về suy luận chi phí tốt, hợp nội dung dài và tái cấu trúc kiến thức.",
    defaultModel: "deepseek-reasoner",
    modelEnvNames: ["AI_DEEPSEEK_MODEL", "DEEPSEEK_MODEL", "AI_DEFAULT_MODEL"],
    apiKeyEnvNames: ["DEEPSEEK_API_KEY"],
    baseUrl: "https://api.deepseek.com",
    kind: "openai-compatible",
  },
  qwen: {
    label: "Qwen / DashScope",
    description: "Dùng endpoint compatible-mode của DashScope để gọi như OpenAI.",
    defaultModel: "qwen3.5-plus",
    modelEnvNames: ["AI_QWEN_MODEL", "QWEN_MODEL", "AI_DEFAULT_MODEL"],
    apiKeyEnvNames: ["QWEN_API_KEY", "DASHSCOPE_API_KEY"],
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    baseUrlEnvNames: ["QWEN_BASE_URL", "DASHSCOPE_BASE_URL"],
    kind: "openai-compatible",
  },
};

function readFirstEnv(names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function getProviderDefaultModel(provider: LessonAiProvider): string {
  const definition = PROVIDERS[provider];
  return readFirstEnv(definition.modelEnvNames) || definition.defaultModel;
}

function getProviderApiKey(provider: LessonAiProvider): string | null {
  return readFirstEnv(PROVIDERS[provider].apiKeyEnvNames);
}

function getProviderBaseUrl(provider: LessonAiProvider): string | undefined {
  const definition = PROVIDERS[provider];
  return readFirstEnv(definition.baseUrlEnvNames ?? []) || definition.baseUrl;
}

function getConfiguredProviders(): LessonAiProvider[] {
  return (Object.keys(PROVIDERS) as LessonAiProvider[]).filter((provider) =>
    Boolean(getProviderApiKey(provider))
  );
}

function getDefaultProvider(): LessonAiProvider {
  const configuredProviders = getConfiguredProviders();
  const envProvider = process.env.AI_DEFAULT_PROVIDER?.trim();

  if (envProvider && isLessonAiProvider(envProvider) && getProviderApiKey(envProvider)) {
    return envProvider;
  }

  if (configuredProviders.length > 0) {
    return configuredProviders[0];
  }

  return "gemini";
}

function normalizeModelHint(modelInput?: string): string {
  return modelInput?.trim().toLowerCase() || "";
}

function inferProviderFromModel(modelInput?: string): LessonAiProvider | null {
  const modelHint = normalizeModelHint(modelInput);

  if (!modelHint) {
    return null;
  }

  if (
    modelHint === "chatgpt" ||
    modelHint === "chat gpt" ||
    modelHint === "chat-gpt" ||
    modelHint === "openai" ||
    modelHint === "gpt" ||
    modelHint === "gpt 5" ||
    modelHint === "gpt-5" ||
    modelHint.startsWith("gpt-") ||
    modelHint.startsWith("gpt ") ||
    /^o[134]\b/.test(modelHint)
  ) {
    return "openai";
  }

  if (
    modelHint === "gemini" ||
    modelHint === "google gemini" ||
    modelHint.startsWith("gemini-") ||
    modelHint.startsWith("gemini ")
  ) {
    return "gemini";
  }

  if (
    modelHint === "deepseek" ||
    modelHint === "deep seek" ||
    modelHint.startsWith("deepseek-") ||
    modelHint.startsWith("deepseek ")
  ) {
    return "deepseek";
  }

  if (
    modelHint === "qwen" ||
    modelHint.startsWith("qwen") ||
    modelHint.startsWith("qwq")
  ) {
    return "qwen";
  }

  if (
    modelHint === "groq" ||
    modelHint.includes("gpt-oss") ||
    modelHint.startsWith("llama-") ||
    modelHint.startsWith("llama ") ||
    modelHint.startsWith("mixtral")
  ) {
    return "groq";
  }

  return null;
}

function resolveCanonicalModel(
  provider: LessonAiProvider,
  modelInput?: string
): string {
  const trimmedModel = modelInput?.trim();
  const modelHint = normalizeModelHint(modelInput);

  if (!trimmedModel) {
    return getProviderDefaultModel(provider);
  }

  if (
    modelHint === "chatgpt" ||
    modelHint === "chat gpt" ||
    modelHint === "chat-gpt" ||
    modelHint === "openai" ||
    modelHint === "gpt" ||
    modelHint === "gpt 5" ||
    modelHint === "gpt-5"
  ) {
    return getProviderDefaultModel(
      provider === "openrouter" ? "openrouter" : "openai"
    );
  }

  if (modelHint === "gemini" || modelHint === "google gemini") {
    return "gemini-2.5-flash";
  }

  if (modelHint === "deepseek" || modelHint === "deep seek") {
    return getProviderDefaultModel("deepseek");
  }

  if (modelHint === "qwen") {
    return getProviderDefaultModel("qwen");
  }

  if (modelHint === "groq") {
    return getProviderDefaultModel("groq");
  }

  return trimmedModel;
}

function shouldPreferInferredProvider(
  explicitProvider: LessonAiProvider | null,
  inferredProvider: LessonAiProvider | null
): inferredProvider is LessonAiProvider {
  if (!inferredProvider || inferredProvider === explicitProvider) {
    return false;
  }

  if (!explicitProvider) {
    return true;
  }

  // OpenRouter is an aggregator, so keep it when the hint is an OpenAI-family
  // model such as gpt-5. Provider-family aliases like "Gemini" still remap.
  return !(explicitProvider === "openrouter" && inferredProvider === "openai");
}

function resolveRequestedProvider(
  providerInput?: string,
  modelInput?: string
): LessonAiProvider {
  const explicitProvider =
    providerInput && isLessonAiProvider(providerInput) ? providerInput : null;
  const inferredProvider = inferProviderFromModel(modelInput);

  if (shouldPreferInferredProvider(explicitProvider, inferredProvider)) {
    if (!getProviderApiKey(inferredProvider)) {
      throw new ProviderRequestError(
        `Model "${modelInput?.trim()}" thuộc provider "${inferredProvider}" nhưng provider này chưa được cấu hình API key.`,
        400,
        inferredProvider
      );
    }

    return inferredProvider;
  }

  return explicitProvider || getDefaultProvider();
}

function toProviderRequestError(
  error: unknown,
  provider: LessonAiProvider
): ProviderRequestError {
  if (error instanceof ProviderRequestError) {
    return error;
  }

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : 500;

  return new ProviderRequestError(
    error instanceof Error ? error.message : "Unknown error",
    status,
    provider
  );
}

export function getLessonGenerationClientConfig(): LessonAiClientConfig {
  const providers = (Object.keys(PROVIDERS) as LessonAiProvider[]).map(
    (provider): LessonAiProviderOption => ({
      value: provider,
      label: PROVIDERS[provider].label,
      description: PROVIDERS[provider].description,
      configured: Boolean(getProviderApiKey(provider)),
      defaultModel: getProviderDefaultModel(provider),
    })
  );

  return {
    defaultProvider: getDefaultProvider(),
    providers,
  };
}

function resolveLessonGenerationSelection(
  providerInput?: string,
  modelInput?: string
): LessonGenerationSelection {
  const requestedProvider = resolveRequestedProvider(providerInput, modelInput);

  const apiKey = getProviderApiKey(requestedProvider);
  if (!apiKey) {
    throw new ProviderRequestError(
      `Provider "${requestedProvider}" chưa được cấu hình API key.`,
      500,
      requestedProvider
    );
  }

  return {
    provider: requestedProvider,
    model: resolveCanonicalModel(requestedProvider, modelInput),
    apiKey,
    baseUrl: getProviderBaseUrl(requestedProvider),
  };
}

function buildSystemPrompt(): string {
  return [
    "You are a senior instructional designer and Python teacher.",
    "Transform raw study material into a Vietnamese lesson draft.",
    "Return only one valid JSON object and nothing else.",
    "Do not wrap the JSON in markdown fences.",
    "All user-facing prose must be in Vietnamese.",
    'Lesson section "content" and exercise "question" must be valid HTML.',
    'When showing code, always wrap it in <div class="code-block">...</div>.',
    "When a concept needs a screenshot or visual aid, insert a lesson image placeholder div instead of inventing an image URL.",
    'Exercise "answer" must be plain text or plain code, never HTML.',
    "If the source has no exercise, create one relevant practice exercise.",
    "Keep the structure concise, practical, and classroom-ready.",
  ].join("\n");
}

function buildUserPrompt(content: string): string {
  return [
    "Return JSON with exactly this shape:",
    "{",
    '  "title": "string",',
    '  "duration": 120,',
    '  "difficulty": "beginner | intermediate | advanced",',
    '  "objectives": {',
    '    "knowledge": "string",',
    '    "skills": "string",',
    '    "attitude": "string"',
    "  },",
    '  "sections": [',
    "    {",
    '      "title": "string",',
    '      "content": "HTML string"',
    "    }",
    "  ],",
    '  "exercises": [',
    "    {",
    '      "type": "practice | homework",',
    '      "title": "string",',
    '      "question": "HTML string",',
    '      "answer": "plain text or plain code",',
    '      "points": 10,',
    '      "difficulty": "easy | medium | hard",',
    '      "answerVisible": true',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Create 2-5 sections when the source is rich enough.",
    "- Section titles should be short and suitable for lesson tabs.",
    "- Keep HTML clean. Use h2, h3, p, ul, ol, li, table, thead, tbody, tr, th, td, strong, em, code, div when needed.",
    '- Use image placeholders when a screen, UI location, diagram, or visual sequence would help: <div class="lesson-media-placeholder" data-placeholder-id="short-kebab-id" data-suggested-caption="Mo ta anh can chen">Can anh minh hoa: mo ta ngan</div>.',
    "- Placeholder ids must be unique within the draft and use lowercase letters, numbers, and hyphens.",
    "- For homework, make the question more complete and outcome-driven.",
    "- For practice, keep the task shorter and suitable for immediate reinforcement.",
    "- Use realistic Python examples instead of placeholders.",
    "",
    "Source material:",
    "<source>",
    content.trim(),
    "</source>",
  ].join("\n");
}

function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim().replace(/^\uFEFF/, "");

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  return cleaned.trim();
}

function parseJsonObject(rawText: string): unknown {
  const cleaned = cleanJsonText(rawText);

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Model did not return a valid JSON object.");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function getGeminiFallbackModels(model: string): string[] {
  const normalizedModel = model.trim().toLowerCase();

  if (normalizedModel.includes("flash-lite")) {
    return [];
  }

  if (normalizedModel.includes("flash")) {
    return ["gemini-2.5-flash-lite"];
  }

  return ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
}

function shouldRetryWithGeminiFallback(
  error: ProviderRequestError,
  currentModel: string
): boolean {
  const normalizedModel = currentModel.trim().toLowerCase();
  const normalizedMessage = error.message.toLowerCase();

  if (normalizedModel.includes("flash-lite")) {
    return false;
  }

  return (
    error.status === 404 ||
    error.status === 429 ||
    normalizedMessage.includes("quota exceeded") ||
    normalizedMessage.includes("limit: 0") ||
    normalizedMessage.includes("too many requests") ||
    normalizedMessage.includes("not found") ||
    normalizedMessage.includes("not available")
  );
}

async function requestGemini(
  selection: LessonGenerationSelection,
  systemPrompt: string,
  userPrompt: string
): Promise<ModelTextResult> {
  try {
    const genAI = new GoogleGenerativeAI(selection.apiKey);
    const model = genAI.getGenerativeModel({
      model: selection.model,
      generationConfig: {
        temperature: 0.2,
      },
    });

    const result = await model.generateContent(
      [systemPrompt, userPrompt].join("\n\n")
    );

    return {
      model: selection.model,
      text: result.response.text().trim(),
    };
  } catch (error) {
    throw toProviderRequestError(error, selection.provider);
  }
}

async function generateWithGemini(
  selection: LessonGenerationSelection,
  systemPrompt: string,
  userPrompt: string
): Promise<ModelTextResult> {
  const modelsToTry = [
    selection.model,
    ...getGeminiFallbackModels(selection.model),
  ].filter((model, index, items) => items.indexOf(model) === index);

  let lastError: ProviderRequestError | null = null;

  for (const modelName of modelsToTry) {
    try {
      return await requestGemini(
        {
          ...selection,
          model: modelName,
        },
        systemPrompt,
        userPrompt
      );
    } catch (error) {
      const providerError = toProviderRequestError(error, selection.provider);
      lastError = providerError;

      if (!shouldRetryWithGeminiFallback(providerError, modelName)) {
        throw providerError;
      }
    }
  }

  throw lastError ?? new ProviderRequestError(
    `Provider "${selection.provider}" không trả về nội dung hợp lệ.`,
    502,
    selection.provider
  );
}

function buildOpenAiCompatibleHeaders(
  provider: LessonAiProvider,
  apiKey: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (provider === "openrouter") {
    const referer =
      process.env.OPENROUTER_HTTP_REFERER?.trim() ||
      process.env.APP_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim();
    const title =
      process.env.OPENROUTER_APP_NAME?.trim() ||
      process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
      "python-lms";

    if (referer) {
      headers["HTTP-Referer"] = referer;
    }

    if (title) {
      headers["X-Title"] = title;
    }
  }

  return headers;
}

function extractCompatibleText(data: Record<string, unknown>): string {
  const choices = Array.isArray(data.choices)
    ? (data.choices as Array<Record<string, unknown>>)
    : [];
  const firstChoice = choices[0];
  const message =
    firstChoice && typeof firstChoice === "object"
      ? (firstChoice.message as Record<string, unknown> | undefined)
      : undefined;

  if (typeof message?.content === "string") {
    return message.content;
  }

  if (Array.isArray(message?.content)) {
    return message.content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          typeof (part as Record<string, unknown>).text === "string"
        ) {
          return String((part as Record<string, unknown>).text);
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

async function requestOpenAiCompatible(
  selection: LessonGenerationSelection,
  systemPrompt: string,
  userPrompt: string,
  useJsonMode: boolean
): Promise<ModelTextResult> {
  if (!selection.baseUrl) {
    throw new ProviderRequestError(
      `Provider "${selection.provider}" thiếu base URL.`,
      500,
      selection.provider
    );
  }

  const payload: Record<string, unknown> = {
    model: selection.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (useJsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch(`${selection.baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildOpenAiCompatibleHeaders(selection.provider, selection.apiKey),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = `Provider ${selection.provider} trả về lỗi ${response.status}.`;

    try {
      const errorBody = (await response.json()) as Record<string, unknown>;
      const error =
        errorBody.error && typeof errorBody.error === "object"
          ? (errorBody.error as Record<string, unknown>)
          : null;

      message =
        (typeof error?.message === "string" && error.message) ||
        (typeof errorBody.message === "string" && errorBody.message) ||
        message;
    } catch {
      const text = await response.text();
      if (text.trim()) {
        message = text.trim();
      }
    }

    throw new ProviderRequestError(
      message,
      response.status,
      selection.provider
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  const text = extractCompatibleText(data);

  if (!text) {
    throw new ProviderRequestError(
      `Provider "${selection.provider}" không trả về nội dung hợp lệ.`,
      502,
      selection.provider
    );
  }

  return {
    model: selection.model,
    text,
  };
}

async function generateWithOpenAiCompatible(
  selection: LessonGenerationSelection,
  systemPrompt: string,
  userPrompt: string
): Promise<ModelTextResult> {
  try {
    return await requestOpenAiCompatible(
      selection,
      systemPrompt,
      userPrompt,
      true
    );
  } catch (error) {
    if (error instanceof ProviderRequestError && error.status === 400) {
      return requestOpenAiCompatible(selection, systemPrompt, userPrompt, false);
    }

    throw error;
  }
}

export async function generateLessonDraft(options: {
  content: string;
  provider?: string;
  model?: string;
}): Promise<LessonGenerationResult> {
  const selection = resolveLessonGenerationSelection(
    options.provider,
    options.model
  );
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(options.content);

  try {
    const rawResult =
      PROVIDERS[selection.provider].kind === "gemini"
        ? await generateWithGemini(selection, systemPrompt, userPrompt)
        : await generateWithOpenAiCompatible(
            selection,
            systemPrompt,
            userPrompt
          );

    const parsed = parseJsonObject(rawResult.text);

    return {
      draft: normalizeLessonDraft(parsed),
      meta: {
        provider: selection.provider,
        model: rawResult.model,
      },
    };
  } catch (error) {
    throw toProviderRequestError(error, selection.provider);
  }
}

export async function generateAiJsonObject(options: {
  systemPrompt: string;
  userPrompt: string;
  provider?: string;
  model?: string;
}): Promise<{
  json: unknown;
  meta: {
    provider: LessonAiProvider;
    model: string;
  };
}> {
  const selection = resolveLessonGenerationSelection(
    options.provider,
    options.model
  );

  try {
    const rawResult =
      PROVIDERS[selection.provider].kind === "gemini"
        ? await generateWithGemini(
            selection,
            options.systemPrompt,
            options.userPrompt
          )
        : await generateWithOpenAiCompatible(
            selection,
            options.systemPrompt,
            options.userPrompt
          );

    return {
      json: parseJsonObject(rawResult.text),
      meta: {
        provider: selection.provider,
        model: rawResult.model,
      },
    };
  } catch (error) {
    throw toProviderRequestError(error, selection.provider);
  }
}
