import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type LessonAiClientConfig,
  type LessonAiProvider,
  type LessonAiProviderOption,
  type LessonGenerationContext,
  isLessonAiProvider,
} from "@/lib/ai/provider-types";
import {
  normalizeContentBlocks,
  normalizeLessonDraft,
  type LessonObjectivesDraft,
  type LessonDraft,
} from "@/lib/lessons/lesson-draft";
import {
  coerceCanvasToRoleHint,
  normalizeGeneratedCanvasBlocks,
} from "@/lib/lessons/canvas-structure";
import type { LessonContentBlock } from "@/lib/lessons/lesson-media";

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

interface LessonObjectivesResult {
  objectives: LessonObjectivesDraft;
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

// Bảng thuật ngữ chuẩn ép AI dịch nhất quán, tránh kiểu "Hiểu danh sách" cho List
// Comprehension. Dùng chung cho cả luồng full-AI và canvas.
const PYTHON_GLOSSARY: ReadonlyArray<readonly [string, string]> = [
  ["List Comprehension", 'giữ nguyên "List Comprehension" (chú thích: cú pháp tạo list nhanh)'],
  ["Tuple", 'giữ nguyên "tuple"'],
  ["Dictionary", 'giữ "dictionary" (hoặc "từ điển")'],
  ["Boolean", 'giữ "boolean"'],
  ["String", '"chuỗi"'],
  ["Integer", '"số nguyên"'],
  ["Loop", '"vòng lặp"'],
  ["Indentation", '"thụt lề"'],
  ["Variable", '"biến"'],
  ["Function", '"hàm"'],
];

// Ràng buộc soạn bài dùng chung: quy chuẩn code (PEP8 snake_case, không tên biến
// tiếng Việt), glossary thuật ngữ, và ngữ cảnh đối tượng/phong cách (nếu có).
function buildAuthoringConstraints(context?: LessonGenerationContext): string[] {
  const lines: string[] = [
    "Quy chuẩn code & thuật ngữ (BẮT BUỘC):",
    "- Tên biến/hàm trong code: snake_case TIẾNG ANH (PEP8). TUYỆT ĐỐI KHÔNG đặt tên biến bằng tiếng Việt có dấu hoặc có dấu cách (KHÔNG dùng 'tên_học_sinh' hay 'ten hoc sinh' — dùng 'student_name').",
    "- KHÔNG dịch máy móc thuật ngữ lập trình thành tiếng Việt tối nghĩa. Bảng thuật ngữ chuẩn:",
    ...PYTHON_GLOSSARY.map(([en, vi]) => `  • ${en} → ${vi}`),
    "- Thuật ngữ chưa có trong bảng: giữ nguyên tiếng Anh, chú thích ngắn tiếng Việt trong ngoặc ở lần đầu xuất hiện.",
  ];

  if (context?.audience === "grade6_7") {
    lines.push(
      "- Đối tượng: học sinh lớp 6-7. Câu ngắn, ví dụ đời thường, ẩn dụ dễ hình dung, giọng gần gũi."
    );
  } else if (context?.audience === "grade8_9") {
    lines.push(
      "- Đối tượng: học sinh lớp 8-9. Trình bày thực tế, học thuật vừa phải, ví dụ sát ứng dụng."
    );
  }

  if (context?.style === "gamified") {
    lines.push(
      "- Phong cách: game hóa — khung truyện/nhiệm vụ, thử thách nhỏ, tạo hứng thú khám phá."
    );
  } else if (context?.style === "project") {
    lines.push(
      "- Phong cách: học qua dự án — gắn các khái niệm vào một sản phẩm nhỏ xuyên suốt bài."
    );
  } else if (context?.style === "concise") {
    lines.push("- Phong cách: cơ bản, ngắn gọn — đi thẳng trọng tâm, ít rườm rà.");
  }

  return lines;
}

function buildSystemPrompt(): string {
  return [
    "You are a senior instructional designer and Python teacher.",
    "Transform raw study material into a well-structured Vietnamese lesson draft.",
    "Return ONLY one valid JSON object — no markdown fences, no extra text before or after.",
    "All user-facing text (titles, objectives, canvas content, exercise questions) MUST be in Vietnamese.",
    "Keep every response within 8000 tokens. Prioritize completeness of structure over verbosity of prose.",
  ].join("\n");
}

function buildUserPrompt(content: string, context?: LessonGenerationContext): string {
  return [
    ...buildAuthoringConstraints(context),
    "",
    "Return JSON with exactly this shape:",
    `{
  "title": "string — Vietnamese lesson title",
  "duration": 120,
  "difficulty": "beginner | intermediate | advanced",
  "objectives": {
    "knowledge": "Vietnamese string",
    "skills": "Vietnamese string",
    "attitude": "Vietnamese string"
  },
  "sections": [
    {
      "title": "string — short tab label in Vietnamese",
      "content": "",
      "contentFormat": "canvas",
      "contentBlocks": [
        {
          "id": "canvas-1",
          "type": "teaching_canvas",
          "title": "string — one-line canvas headline in Vietnamese",
          "layout": "hero | cards | highlight | text | split | code | media",
          "mainHtml": "HTML string — main explanation (empty string for hero/cards layout)",
          "code": "plain Python code only, no HTML tags, empty string if none",
          "mediaId": "",
          "notesHtml": "",
          "reveal": true,
          "steps": [
            { "id": "step-1", "text": "short Vietnamese bullet sentence" }
          ],
          "cards": [
            { "icon": "fa-icon-name", "title": "Card title", "description": "Short description" }
          ]
        }
      ]
    }
  ],
  "exercises": [
    {
      "type": "practice | homework",
      "title": "string",
      "question": "HTML string in Vietnamese",
      "answer": "plain text or plain Python code, never HTML",
      "points": 10,
      "difficulty": "easy | medium | hard",
      "answerVisible": true
    }
  ]
}`,
    "",
    "Layout selection rules — pick the BEST layout for each canvas:",
    "- 'hero': FIRST canvas of the FIRST section ONLY. Large title slide (title = lesson name, mainHtml = short tagline). No steps, no code.",
    "- 'cards': When listing 2–4 parallel concepts each needing an icon (e.g. use-cases, features, categories). Use 'cards' array — omit mainHtml. FA solid icon names (fa-youtube, fa-robot, fa-rocket, fa-database, fa-code, fa-chart-bar, fa-gear, fa-globe, fa-user, fa-shield, fa-bolt, fa-star).",
    "- 'highlight': Key concept, definition, or memorable rule. mainHtml is the highlighted content. Steps optionally reveal elaboration.",
    "- 'code': Canvas focused on a code example. mainHtml = brief explanation. code field = runnable Python. Steps walk through the code line by line.",
    "- 'split': Visual concept needing an image. mainHtml on left, placeholder image on right. Use media-placeholder inside mainHtml.",
    "- 'text': Pure prose explanation, no code or image needed.",
    "",
    "Additional rules:",
    "- LAYOUT REQUIRES ITS FIELD — invalid without it: 'checklist'/'timeline'/'flow'/'mindmap' MUST fill the 'steps' array (not <li> in mainHtml); 'code'/'code_explain' MUST have non-empty 'code'; 'compare' needs exactly 2 cards. If the content for that field is missing, use 'text' or 'highlight' instead.",
    "- Every exercise MUST include a correct, runnable Python 'answer' (the model answer). Never leave 'answer' empty.",
    "- objectives.knowledge / objectives.skills / objectives.attitude are REQUIRED. If the source has no explicit objectives, infer them from the lesson title, concepts, code examples, and exercises. Never leave them blank.",
    "- Create 2–5 sections. Section titles must be short tab labels.",
    "- Each section: 2–5 teaching_canvas blocks. Each canvas teaches exactly one idea.",
    "- NEVER ship a near-empty slide: a 'text' or 'highlight' canvas must carry a short paragraph PLUS 2–4 reveal steps, not a single lone sentence (that leaves the 16:9 frame mostly blank). For one standalone golden-rule sentence use a 'highlight' with elaboration steps instead.",
    "- reveal steps: 2–5 short Vietnamese sentences. Use steps to reveal key points progressively.",
    "- code field: PLAIN Python only — no <code>, no <div>, no HTML at all. Empty string when not needed.",
    "- mainHtml: valid HTML using h2, h3, p, ul, ol, li, strong, em, code, table, div. Keep it concise.",
    "- When a screenshot or diagram would help (split layout): embed placeholder in mainHtml:",
    '  <div class="lesson-media-placeholder" data-placeholder-id="unique-kebab-id" data-suggested-caption="Mô tả ảnh">Ảnh: mô tả ngắn</div>',
    "  Placeholder ids must be unique, lowercase, letters/numbers/hyphens only. Leave mediaId as empty string.",
    "- For homework: detailed, outcome-driven question. For practice: short, immediate reinforcement.",
    "- answer field: realistic, runnable Python. Never HTML.",
    "- If no exercise in source, create one practice exercise.",
    "- Use realistic variable names and data, not foo/bar placeholders.",
    "- mainHtml MUST NOT merely repeat the canvas 'title'. It is a lead-in: a definition, context, or one-sentence framing that ADDS information. For 'cards' and 'hero' layouts leave mainHtml empty (the title is the headline). Never set mainHtml to the title wrapped in <p>…</p>.",
    "- 'code_explain' must have CLEAN code: no blank lines and no comment-only lines, because each physical code line is paired 1:1 with a reveal step. Provide exactly one step per code line, in the same order. (Use ordinary 'code' layout if you want decorative comments/blank lines.)",
    "- ALWAYS describe the expected result of a runnable example. For console code put the output as a comment (e.g. '# Kết quả: ...') or in mainHtml; for VISUAL output (turtle/đồ họa/matplotlib) describe what is drawn in 'notesHtml' and add a media placeholder so a teacher can attach a screenshot.",
    "- section 'content' (when contentFormat is 'canvas') is a 1–2 sentence Vietnamese SUMMARY of the section for previews — never a copy of the full canvas text. Keep it under ~200 characters.",
    "- A recap/summary section must not duplicate itself across canvases: if you use both 'cards' and 'checklist', give them DISTINCT focus — 'cards' = key concepts learned, 'checklist' = 'Em có thể …' can-do skills. No overlapping wording.",
    "- Coverage: every concept, formula, or command referenced in the objectives OR required to solve an exercise (e.g. the 360/n turning-angle formula, the setup commands import/Turtle()/done()) MUST be explicitly taught in a canvas of the lesson body.",
    "- Homework hints must be GUIDING QUESTIONS or idea prompts, not a step-by-step recipe that gives away the solution. Practice hints may be more direct.",
    "",
    "EXAMPLES of well-formed canvas blocks (one per layout):",
    `[
  {
    "id": "canvas-intro",
    "type": "teaching_canvas",
    "title": "Bài 1: Làm quen với Python",
    "layout": "hero",
    "mainHtml": "<p>Hành trình trở thành Nhà Sáng Tạo Công Nghệ</p>",
    "code": "", "mediaId": "", "notesHtml": "", "reveal": false, "steps": []
  },
  {
    "id": "canvas-usecases",
    "type": "teaching_canvas",
    "title": "Python ở đâu quanh ta?",
    "layout": "cards",
    "mainHtml": "", "code": "", "mediaId": "", "notesHtml": "", "reveal": false, "steps": [],
    "cards": [
      { "icon": "fa-youtube", "title": "Giải trí", "description": "YouTube dùng Python để gợi ý video em thích xem." },
      { "icon": "fa-rocket",  "title": "Khám phá", "description": "NASA dùng Python để điều khiển tàu vũ trụ." },
      { "icon": "fa-robot",   "title": "Trí tuệ nhân tạo", "description": "Các chatbot thông minh đều nói ngôn ngữ Python." }
    ]
  },
  {
    "id": "canvas-print-basics",
    "type": "teaching_canvas",
    "title": "print() — Lệnh in ra màn hình",
    "layout": "code",
    "mainHtml": "<p>Hàm <code>print()</code> hiển thị giá trị ra màn hình console.</p>",
    "code": "name = 'An'\nprint('Xin chào,', name)\n# Kết quả: Xin chào, An",
    "mediaId": "", "notesHtml": "", "reveal": true,
    "steps": [
      { "id": "canvas-print-basics-step-1", "text": "print() nhận một hoặc nhiều đối số, cách nhau bởi dấu phẩy." },
      { "id": "canvas-print-basics-step-2", "text": "Python tự thêm dấu cách giữa các đối số khi in." },
      { "id": "canvas-print-basics-step-3", "text": "Kết quả in ra màn hình theo thứ tự từ trái sang phải." }
    ]
  },
  {
    "id": "canvas-def",
    "type": "teaching_canvas",
    "title": "Python là gì?",
    "layout": "highlight",
    "mainHtml": "<p><strong>Python</strong> là ngôn ngữ lập trình bậc cao, dễ học, cú pháp gần tiếng Anh — lý tưởng để bắt đầu.</p>",
    "code": "", "mediaId": "", "notesHtml": "", "reveal": true,
    "steps": [
      { "id": "s1", "text": "Guido van Rossum tạo ra Python năm 1991 tại Hà Lan." },
      { "id": "s2", "text": "Python được đặt tên theo chương trình hài Monty Python, không phải loài rắn." }
    ]
  }
]`,
    "",
    "Source material:",
    "<source>",
    content.trim(),
    "</source>",
  ].join("\n");
}

function buildObjectivesSystemPrompt(): string {
  return [
    "You are a senior instructional designer and Python teacher for Vietnamese middle-school students.",
    "Create concise lesson objectives from raw lesson material.",
    "Return ONLY one valid JSON object — no markdown fences, no extra text.",
    "All user-facing text MUST be in Vietnamese.",
  ].join("\n");
}

function buildObjectivesUserPrompt(options: {
  title?: string;
  content: string;
}): string {
  return [
    "Return JSON with exactly this shape:",
    `{
  "objectives": {
    "knowledge": "1-2 concise Vietnamese sentences about what students will understand",
    "skills": "1-2 concise Vietnamese sentences about what students will be able to do",
    "attitude": "1 concise Vietnamese sentence about confidence, curiosity, carefulness, or learning mindset"
  }
}`,
    "",
    "Rules:",
    "- NEVER leave any objective blank.",
    "- If the source already states objectives, preserve and polish them.",
    "- If the source has no explicit objectives, infer realistic objectives from the lesson title, concepts, code examples, and exercises.",
    "- Keep each field short enough for a textarea preview: about 18-35 Vietnamese words.",
    "- Match the level of students in grades 6-9 learning Python.",
    "",
    `Lesson title: ${options.title?.trim() || "(not provided)"}`,
    "",
    "Source material:",
    "<source>",
    options.content.trim(),
    "</source>",
  ].join("\n");
}

function hasMissingObjectives(objectives: LessonObjectivesDraft): boolean {
  return (
    !objectives.knowledge.trim() ||
    !objectives.skills.trim() ||
    !objectives.attitude.trim()
  );
}

function mergeMissingObjectives(
  base: LessonObjectivesDraft,
  fallback: LessonObjectivesDraft
): LessonObjectivesDraft {
  return {
    knowledge: base.knowledge.trim() || fallback.knowledge.trim(),
    skills: base.skills.trim() || fallback.skills.trim(),
    attitude: base.attitude.trim() || fallback.attitude.trim(),
  };
}

function normalizeGeneratedObjectives(parsed: unknown): LessonObjectivesDraft {
  const root =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  const source = root.objectives ?? root;
  return normalizeLessonDraft({ objectives: source }).objectives;
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
  } catch (firstError) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("AI không trả về JSON hợp lệ. Hãy thử lại hoặc rút gọn nội dung nguồn.");
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      const isTruncated =
        firstError instanceof Error &&
        (firstError.message.includes("position") ||
          firstError.message.includes("Unexpected end") ||
          firstError.message.includes("after array element") ||
          firstError.message.includes("after property value"));

      throw new Error(
        isTruncated
          ? "AI trả về JSON bị cắt ngắn (vượt giới hạn output token). Hãy rút gọn tài liệu nguồn hoặc thử lại."
          : "AI không trả về JSON hợp lệ. Hãy thử lại."
      );
    }
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

// Per-call timeout mặc định khi không có deadline chung (vd luồng repair gọi
// objectives riêng lẻ). Nâng AI_REQUEST_TIMEOUT_MS trên gói có maxDuration cao hơn.
const DEFAULT_AI_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 55_000;

// Tổng ngân sách cho MỘT lần gọi serverless. maxDuration=60s trên Vercel Hobby; chừa
// ~3s để serialize/response nên đặt 57s. Hai pass (draft + objectives) phải nằm gọn
// trong ngân sách này thay vì mỗi pass tự lấy full 55s rồi cộng dồn vượt 60s → 504.
const LESSON_REQUEST_BUDGET_MS = Number(process.env.AI_REQUEST_BUDGET_MS) || 57_000;

// Timeout còn lại cho một call dựa trên deadline chung. Có sàn 5s để không hủy ngay
// lập tức khi ngân sách đã cạn (call sẽ tự fail nhanh và sạch).
function resolveCallTimeoutMs(deadline?: number): number {
  if (!deadline) return DEFAULT_AI_TIMEOUT_MS;
  const remaining = deadline - Date.now();
  return Math.max(5_000, Math.min(DEFAULT_AI_TIMEOUT_MS, remaining));
}

// Bọc một promise không hỗ trợ AbortSignal (vd Gemini SDK) bằng deadline để trả lỗi
// sạch trước khi Vercel cắt hàm. Promise.race không hủy được request ngầm nhưng đủ
// để ta thoát đúng hạn thay vì nhận 504 mờ mịt.
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: LessonAiProvider
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new ProviderRequestError(
          `Provider "${provider}" không phản hồi trong thời gian cho phép (${Math.round(
            timeoutMs / 1000
          )} giây).`,
          504,
          provider
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function requestGemini(
  selection: LessonGenerationSelection,
  systemPrompt: string,
  userPrompt: string,
  deadline?: number
): Promise<ModelTextResult> {
  try {
    const genAI = new GoogleGenerativeAI(selection.apiKey);
    const model = genAI.getGenerativeModel({
      model: selection.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 32768,
        responseMimeType: "application/json",
      },
    });

    const result = await withTimeout(
      model.generateContent(userPrompt),
      resolveCallTimeoutMs(deadline),
      selection.provider
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
  userPrompt: string,
  deadline?: number
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
        userPrompt,
        deadline
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
  useJsonMode: boolean,
  deadline?: number
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
    max_tokens: 16384,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (useJsonMode) {
    payload.response_format = { type: "json_object" };
  }

  // Abort the upstream call before the Vercel function timeout (60s on Hobby) so we
  // can return a clean error instead of an opaque 504. Khi có deadline chung (two-pass),
  // call này chỉ lấy phần ngân sách còn lại để tổng không vượt 60s.
  const timeoutMs = resolveCallTimeoutMs(deadline);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${selection.baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildOpenAiCompatibleHeaders(selection.provider, selection.apiKey),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort =
      err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
    throw new ProviderRequestError(
      isAbort
        ? `Provider "${selection.provider}" không phản hồi trong thời gian cho phép (${Math.round(timeoutMs / 1000)} giây).`
        : (err instanceof Error ? err.message : "Network error"),
      isAbort ? 504 : 503,
      selection.provider
    );
  }
  clearTimeout(timeoutId);

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
  userPrompt: string,
  deadline?: number
): Promise<ModelTextResult> {
  try {
    return await requestOpenAiCompatible(
      selection,
      systemPrompt,
      userPrompt,
      true,
      deadline
    );
  } catch (error) {
    if (error instanceof ProviderRequestError && error.status === 400) {
      return requestOpenAiCompatible(
        selection,
        systemPrompt,
        userPrompt,
        false,
        deadline
      );
    }

    throw error;
  }
}

async function requestLessonObjectives(
  selection: LessonGenerationSelection,
  options: {
    title?: string;
    content: string;
  },
  deadline?: number
): Promise<{ objectives: LessonObjectivesDraft; model: string }> {
  const rawResult =
    PROVIDERS[selection.provider].kind === "gemini"
      ? await generateWithGemini(
          selection,
          buildObjectivesSystemPrompt(),
          buildObjectivesUserPrompt(options),
          deadline
        )
      : await generateWithOpenAiCompatible(
          selection,
          buildObjectivesSystemPrompt(),
          buildObjectivesUserPrompt(options),
          deadline
        );

  const objectives = normalizeGeneratedObjectives(parseJsonObject(rawResult.text));
  if (hasMissingObjectives(objectives)) {
    throw new ProviderRequestError(
      "AI không trả đủ 3 mục tiêu bài giảng.",
      502,
      selection.provider
    );
  }

  return {
    objectives,
    model: rawResult.model,
  };
}

export async function generateLessonDraft(options: {
  content: string;
  provider?: string;
  model?: string;
  context?: LessonGenerationContext;
}): Promise<LessonGenerationResult> {
  const selection = resolveLessonGenerationSelection(
    options.provider,
    options.model
  );
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(options.content, options.context);

  // Deadline chung cho cả hai pass (draft + objectives) trong cùng một request
  // serverless, để tổng thời gian không vượt maxDuration của Vercel.
  const deadline = Date.now() + LESSON_REQUEST_BUDGET_MS;

  try {
    const rawResult =
      PROVIDERS[selection.provider].kind === "gemini"
        ? await generateWithGemini(selection, systemPrompt, userPrompt, deadline)
        : await generateWithOpenAiCompatible(
            selection,
            systemPrompt,
            userPrompt,
            deadline
          );

    const parsed = parseJsonObject(rawResult.text);
    let draft = normalizeLessonDraft(parsed);

    // Deterministic structure pass per tab: recover missing steps / demote
    // mismatched layouts so the new lesson clears the reviewer's critical gate.
    draft = {
      ...draft,
      sections: draft.sections.map((section) =>
        Array.isArray(section.contentBlocks)
          ? {
              ...section,
              contentBlocks: normalizeGeneratedCanvasBlocks(
                section.contentBlocks as LessonContentBlock[]
              ),
            }
          : section
      ),
    };

    if (hasMissingObjectives(draft.objectives)) {
      // Best-effort: pass 2 chỉ dùng phần ngân sách CÒN LẠI. Nếu nó timeout/lỗi (vd
      // pass 1 đã ăn gần hết budget), vẫn trả về draft đã có thay vì làm hỏng cả lượt
      // sinh bài — giáo viên tự bổ sung mục tiêu còn thiếu. Tránh 504 do cộng dồn.
      try {
        const objectiveResult = await requestLessonObjectives(
          selection,
          {
            title: draft.title,
            content: options.content,
          },
          deadline
        );
        draft = {
          ...draft,
          objectives: mergeMissingObjectives(
            draft.objectives,
            objectiveResult.objectives
          ),
        };
      } catch (objectiveError) {
        console.warn(
          "Objective enrichment pass skipped (giữ draft chính):",
          objectiveError
        );
      }
    }

    return {
      draft,
      meta: {
        provider: selection.provider,
        model: rawResult.model,
      },
    };
  } catch (error) {
    throw toProviderRequestError(error, selection.provider);
  }
}

export async function generateLessonObjectives(options: {
  content: string;
  title?: string;
  provider?: string;
  model?: string;
}): Promise<LessonObjectivesResult> {
  const selection = resolveLessonGenerationSelection(
    options.provider,
    options.model
  );

  try {
    const result = await requestLessonObjectives(selection, {
      title: options.title,
      content: options.content,
    });

    return {
      objectives: result.objectives,
      meta: {
        provider: selection.provider,
        model: result.model,
      },
    };
  } catch (error) {
    throw toProviderRequestError(error, selection.provider);
  }
}

function buildSectionCanvasSystemPrompt(): string {
  return [
    "You are a senior instructional designer and Python teacher.",
    "You turn ONE lesson tab's raw content into polished teaching-canvas slides.",
    "Return ONLY one valid JSON object — no markdown fences, no extra text.",
    "All user-facing text MUST stay in Vietnamese and PRESERVE the original meaning, examples, code and metaphors. Do NOT invent new facts and do NOT translate code.",
    "Keep the response within 4000 tokens.",
  ].join("\n");
}

function buildSectionCanvasUserPrompt(options: {
  title: string;
  content: string;
  lessonTitle?: string;
  isFirst?: boolean;
  layoutHints?: string[];
  context?: LessonGenerationContext;
}): string {
  const { title, content, lessonTitle, isFirst, layoutHints, context } = options;

  return [
    `You are given ONE lesson tab titled "${title}". Convert ONLY this tab into teaching-canvas slides.`,
    "Do NOT create extra tabs, do NOT merge in unrelated ideas, do NOT drop any code block or example from the source.",
    ...buildAuthoringConstraints(context),
    "",
    "Return JSON with exactly this shape:",
    `{
  "contentBlocks": [
    {
      "id": "canvas-1",
      "type": "teaching_canvas",
      "title": "string — SHORT canvas headline in Vietnamese (max 6 words)",
      "layout": "hero | cards | highlight | timeline | compare | checklist | chat | flow | code_explain | mindmap | quiz | playground | statement | cover | two_col_text | banner | text | split | code",
      "accent": "(optional) indigo | teal | amber | rose | emerald — accent color to vary slide look",
      "ratio": "(optional, only for split/code slides) even | wide-text | wide-side",
      "mainHtml": "HTML string — main explanation (empty for hero/cards/compare/timeline layout)",
      "code": "plain Python code only, no HTML tags, empty string if none",
      "mediaId": "",
      "notesHtml": "",
      "reveal": true,
      "steps": [ { "id": "step-1", "text": "short Vietnamese bullet sentence" } ],
      "cards": [ { "icon": "fa-icon-name", "title": "Card title", "description": "Short description" } ]
    }
  ]
}`,
    "",
    "Layout selection rules — VARY the layout across canvases, do NOT repeat one layout for the whole tab:",
    isFirst
      ? `- 'hero': the VERY FIRST canvas of this tab MUST be a hero opener. title = the lesson title "${lessonTitle ?? title}". mainHtml = ONE short motivating sentence wrapped in <p>. No code, no steps, reveal=false.`
      : "- 'hero': do NOT use hero for this tab (only the opening tab has one).",
    "- 'cards': when listing 2–4 parallel concepts/items each needing an icon. Use the 'cards' array — leave mainHtml empty. FA solid icon names (fa-lightbulb, fa-robot, fa-rocket, fa-database, fa-code, fa-gear, fa-bolt, fa-star, fa-triangle-exclamation, fa-wand-magic-sparkles).",
    "- 'highlight': a key concept, definition or memorable rule. mainHtml holds the highlighted content. Great for 'bí mật', 'lưu ý', 'ghi nhớ'.",
    "- 'timeline': a process or ordered sequence of steps. Put each step as ONE entry in 'steps' (in order), leave mainHtml empty. Use for 'các bước', 'quy trình', 'lần lượt'.",
    "- 'compare': comparing exactly TWO things (A vs B, đúng/sai, trước/sau, có/không ép kiểu). Use 'cards' with EXACTLY 2 entries: cards[0]=left side, cards[1]=right side (icon + title + description). Leave mainHtml empty.",
    "- 'checklist': a summary / takeaways slide. Put each takeaway as ONE entry in 'steps'; optional one-line intro in mainHtml. Use for 'tổng kết', 'ghi nhớ', 'tóm tắt'.",
    "- 'chat': a dialogue between two speakers (e.g. máy tính ↔ học sinh, hỏi ↔ đáp). Use 'cards' where each card = one line: title = speaker name, description = what they say (icon optional). Leave mainHtml empty. Great for input/output examples.",
    "- 'flow': a SHORT horizontal pipeline of 2–4 nodes with arrows (e.g. \"12\" → int() → 12, or Input → Process → Output). Put each node as ONE SHORT entry in 'steps'. Leave mainHtml empty. Ideal for data transformation / ép kiểu.",
    "- 'code_explain': read a code example with per-line notes. Put the Python in 'code', and ONE explanation per code line (in order) as 'steps'. Use when the goal is to UNDERSTAND existing code line by line. A line-by-line walkthrough MUST use 'code_explain' (code + steps in the SAME canvas) — do NOT explain code as a separate 'timeline'/'checklist', and do NOT split the code into one canvas and its line notes into another; that detaches the notes from the code.",
    "- 'mindmap': a one-level summary tree. title = central topic, each branch = ONE entry in 'steps'. Good as an alternative summary slide.",
    "- 'quiz': a quick multiple-choice check (NOT graded). mainHtml = the question. 'cards' = 2–4 options where each option's title = the option text and EXACTLY ONE option has \"correct\": true. notesHtml = a short explanation shown after answering. Use AT MOST ONE quiz per tab, only when it reinforces the key idea.",
    "- 'playground': let the student edit & run Python in the slide. Put a SHORT runnable starter program in 'code'. No steps. Use AT MOST ONE per tab when hands-on practice helps.",
    "- 'statement': ONE short memorable sentence shown large & centered (a golden rule / key takeaway). Put the sentence in mainHtml, a short label in title. No code/steps.",
    "- 'two_col_text': a longer prose explanation that reads better in two newspaper-style columns. Put 3–5 short <p> in mainHtml.",
    "- 'banner': a short section-divider slide between major parts. title = the part name, mainHtml = one optional sub-line.",
    "- ('cover' exists for a chapter opener with a background image but needs a real image; prefer 'hero' unless an image is provided.)",
    "- 'code': a canvas focused on a Python example. mainHtml = ONE short explanation sentence, code = runnable Python, steps walk through it.",
    "",
    "Optional polish: you MAY set 'accent' (indigo/teal/amber/rose/emerald) to vary the color from slide to slide, and 'ratio' on split/code slides. Keep it tasteful — don't randomize wildly.",
    "- 'text': pure prose explanation when nothing above fits.",
    layoutHints && layoutHints.length > 0
      ? `- Preferred layout for this tab: "${layoutHints[0]}" — use it for the MAIN canvas unless clearly unsuitable.${
          layoutHints.length > 1
            ? ` Other layouts that may fit: ${layoutHints.slice(1).join(", ")}.`
            : ""
        }`
      : "",
    "",
    "Quality rules (the slides must look polished and fit on screen):",
    '- EVERY object in contentBlocks MUST include "type": "teaching_canvas". Never emit other block types.',
    "- LAYOUT REQUIRES ITS FIELD — a layout is INVALID (and will be rejected) without it: 'checklist'/'timeline'/'flow'/'mindmap' MUST fill the 'steps' array (put each point in steps, NOT as <li> inside mainHtml); 'code'/'playground' MUST have non-empty 'code'; 'code_explain' MUST have BOTH 'code' and one 'steps' entry per line; 'compare' MUST have EXACTLY 2 cards; 'quiz' MUST have 2–4 cards with EXACTLY one \"correct\": true. If you don't have that field's content, pick 'text'/'highlight' instead.",
    "- Produce 2–4 canvases for this tab. Each canvas teaches exactly ONE idea — split a long tab into several canvases instead of one crowded slide.",
    "- Canvas titles must be SHORT (max 6 words). Never reuse the full tab title as a canvas title.",
    "- Keep mainHtml SHORT: at most ~45 words / 2 short paragraphs per canvas so it never overflows. Move detail into 2–4 reveal steps.",
    "- NEVER ship a near-empty slide: a 'text' (or 'highlight') canvas must NOT be just ONE short sentence with no steps — that leaves the 16:9 frame mostly blank. Either (a) add 2–4 reveal steps, or (b) use 'statement' (one big centered takeaway) for a single golden-rule sentence, or 'banner' for a section divider. Each 'text'/'highlight' canvas should carry a short paragraph PLUS 2–4 steps to fill the slide.",
    "- Keep existing Python code and program output VERBATIM. Put program output inside a <pre> in mainHtml, never in the code field.",
    "- reveal steps: 2–4 short Vietnamese sentences.",
    "- code field: PLAIN Python only — no <code>, no <div>, no HTML. Empty string when not needed.",
    "- For a 'code' canvas keep the LEFT side light: at most one short sentence + one short <pre> output (≤1 line) + up to 3 steps. Do NOT stack a heading, a paragraph, an output block AND many steps on the same canvas — split instead.",
    "- code_explain steps: ONE short step per REAL code line, in order. Each step = that line's purpose in ≤1 short sentence. Do NOT repeat the same idea across steps (e.g. don't restate the if/elif branching logic in several steps), and do NOT add a separate 'Output: …' step — expected output belongs in the code's trailing comment or a short <pre>, not as a step.",
    "- Keep code lines short and readable. Put explanatory comments on their OWN line above the code, not as long trailing inline comments.",
    "- mainHtml: valid concise HTML using h3, p, ul, ol, li, strong, em, code.",
    "",
    "Source tab content:",
    "<tab>",
    content.trim(),
    "</tab>",
  ].join("\n");
}

const VI_TITLE_FALLBACK = "Bài học";

/** Deterministic hero canvas — guarantees an opening slide even if the model skips it. */
function buildHeroCanvasBlock(lessonTitle: string, content: string): Record<string, unknown> {
  const firstSentence = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !/^(python|plaintext|code|output)\s*$/i.test(line));
  const tagline =
    firstSentence && firstSentence.length <= 140
      ? firstSentence
      : "Bắt đầu hành trình khám phá bài học nào!";

  return {
    id: `canvas-hero-${Date.now()}`,
    type: "teaching_canvas",
    title: lessonTitle.trim() || VI_TITLE_FALLBACK,
    layout: "hero",
    mainHtml: `<p>${tagline}</p>`,
    code: "",
    mediaId: "",
    notesHtml: "",
    reveal: false,
    steps: [],
  };
}

export async function generateSectionCanvas(options: {
  title: string;
  content: string;
  lessonTitle?: string;
  isFirst?: boolean;
  layoutHints?: string[];
  roleHint?: string;
  provider?: string;
  model?: string;
  context?: LessonGenerationContext;
}): Promise<{
  contentBlocks: unknown[];
  meta: { provider: LessonAiProvider; model: string };
}> {
  const selection = resolveLessonGenerationSelection(
    options.provider,
    options.model
  );
  const systemPrompt = buildSectionCanvasSystemPrompt();
  const userPrompt = buildSectionCanvasUserPrompt({
    title: options.title,
    content: options.content,
    lessonTitle: options.lessonTitle,
    isFirst: options.isFirst,
    layoutHints: options.layoutHints,
    context: options.context,
  });

  try {
    const rawResult =
      PROVIDERS[selection.provider].kind === "gemini"
        ? await generateWithGemini(selection, systemPrompt, userPrompt)
        : await generateWithOpenAiCompatible(selection, systemPrompt, userPrompt);

    const parsed = parseJsonObject(rawResult.text);
    // Be lenient about how the model wraps the blocks: a bare array, or under
    // contentBlocks / blocks / sections.
    const root =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    const rawBlocks = Array.isArray(parsed)
      ? parsed
      : root.contentBlocks ?? root.blocks ?? root.sections ?? [];
    const blocks = (normalizeContentBlocks(rawBlocks) as Record<string, unknown>[] | null) ?? [];

    // Guarantee an opening hero slide on the first tab even if the model skipped
    // it, and never let a stray hero appear on later tabs.
    let finalBlocks: Record<string, unknown>[];
    if (options.isFirst) {
      const hasHero = blocks.some((block) => block.layout === "hero");
      finalBlocks = hasHero
        ? blocks
        : [
            buildHeroCanvasBlock(options.lessonTitle ?? options.title, options.content),
            ...blocks,
          ];
    } else {
      finalBlocks = blocks.filter((block) => block.layout !== "hero");
    }

    // Deterministic structure pass: recover missing steps / demote mismatched
    // layouts so the tab clears the reviewer's critical gate up front.
    let structured = normalizeGeneratedCanvasBlocks(
      finalBlocks as unknown as LessonContentBlock[]
    );

    // "Vai trò gợi ý" là LỆNH: ép canvas chính về đúng layout rồi normalize lại để
    // dọn (nếu không hợp, normalize tự hạ cấp — không tạo canvas vỡ).
    const roleHint = options.roleHint?.trim().toLowerCase();
    if (roleHint) {
      structured = normalizeGeneratedCanvasBlocks(
        coerceCanvasToRoleHint(structured, roleHint)
      );
    }

    return {
      contentBlocks: structured,
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
