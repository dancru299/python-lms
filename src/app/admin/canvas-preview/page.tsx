"use client";

import { useMemo, useState } from "react";
import TeachingCanvasRenderer from "@/components/lessons/TeachingCanvasRenderer";
import { buildTeachingCanvases } from "@/lib/lessons/teaching-canvas";
import type {
  LessonContentBlock,
  LessonTeachingCanvasBlock,
  LessonTeachingCanvasLayout,
} from "@/lib/lessons/lesson-media";

// Small helper so each demo block stays readable — fills the canvas defaults.
function tc(
  b: Partial<LessonTeachingCanvasBlock> & {
    id: string;
    title: string;
    layout: LessonTeachingCanvasLayout;
  }
): LessonTeachingCanvasBlock {
  return {
    type: "teaching_canvas",
    mainHtml: "",
    code: "",
    mediaId: "",
    notesHtml: "",
    reveal: true,
    steps: [],
    ...b,
  };
}

const steps = (...items: string[]) =>
  items.map((text, i) => ({ id: `s-${i + 1}`, text }));

// One block per layout — content themed around "Buổi 4: ép kiểu" for familiarity.
const DEMO_BLOCKS: LessonContentBlock[] = [
  tc({
    id: "demo-hero",
    layout: "hero",
    title: "Buổi Demo: Tất cả Layout Canvas",
    mainHtml: "<p>Lướt qua từng layout mới bằng nút ← →</p>",
    reveal: false,
  }),
  tc({
    id: "demo-timeline",
    layout: "timeline",
    title: "Quy trình nhập dữ liệu",
    accent: "teal",
    steps: steps(
      "Máy tính hiện lời nhắc và chờ",
      "Người dùng gõ phím rồi nhấn Enter",
      "Python nhận về một chuỗi",
      "Chương trình xử lý tiếp"
    ),
  }),
  tc({
    id: "demo-compare",
    layout: "compare",
    title: "Có ép kiểu vs Không ép kiểu",
    cards: [
      { icon: "fa-xmark", title: "Không ép kiểu", description: '"5" + "3" → "53" (nối chuỗi)' },
      { icon: "fa-check", title: "Có ép kiểu", description: "int(5) + int(3) → 8 (cộng số)" },
    ],
  }),
  tc({
    id: "demo-checklist",
    layout: "checklist",
    title: "Ghi nhớ Buổi 4",
    mainHtml: "<p>Ba điều cốt lõi cần nhớ:</p>",
    steps: steps(
      "input() luôn trả về chuỗi (str)",
      "Dùng int() / float() để ép sang số",
      "str() đổi số thành chuỗi"
    ),
  }),
  tc({
    id: "demo-chat",
    layout: "chat",
    title: "Trò chuyện với máy tính",
    cards: [
      { icon: "fa-robot", title: "Python", description: "Cậu tên là gì thế?" },
      { icon: "fa-child", title: "An", description: "Em tên An!" },
      { icon: "fa-robot", title: "Python", description: "Rất vui được làm quen với An!" },
    ],
  }),
  tc({
    id: "demo-flow",
    layout: "flow",
    title: "Pipeline ép kiểu",
    accent: "amber",
    steps: steps('"12" (chuỗi)', "int()", "12 (số nguyên)"),
  }),
  tc({
    id: "demo-code-explain",
    layout: "code_explain",
    title: "Đọc code tính tuổi",
    code: 'ten = input("Tên: ")\ntuoi = int(input("Tuổi: "))\nprint(ten, "- sang năm", tuoi + 1, "tuổi")',
    steps: steps(
      "Nhận tên người dùng (kiểu chuỗi)",
      "Nhận tuổi rồi ép sang số nguyên bằng int()",
      "In tên và tuổi của năm sau"
    ),
  }),
  tc({
    id: "demo-mindmap",
    layout: "mindmap",
    title: "Python cơ bản",
    steps: steps("Input", "Output", "Biến", "Kiểu dữ liệu"),
  }),
  tc({
    id: "demo-quiz",
    layout: "quiz",
    title: "Kiểm tra nhanh",
    mainHtml: "<p>Lệnh <code>input()</code> trả về dữ liệu kiểu gì?</p>",
    notesHtml:
      "<p>input() luôn trả về <strong>chuỗi (str)</strong>, kể cả khi bạn gõ số.</p>",
    cards: [
      { icon: "", title: "Số nguyên (int)", description: "" },
      { icon: "", title: "Chuỗi (str)", description: "", correct: true },
      { icon: "", title: "Số thực (float)", description: "" },
    ],
  }),
  tc({
    id: "demo-playground",
    layout: "playground",
    title: "Thử chạy code",
    code: 'ten = "An"\nprint("Xin chào,", ten)\nfor i in range(3):\n    print("Lần", i + 1)',
  }),
  tc({
    id: "demo-statement",
    layout: "statement",
    title: "Nguyên tắc vàng",
    mainHtml: "<p>input() <strong>luôn</strong> trả về chuỗi — muốn tính toán thì phải ép kiểu!</p>",
    accent: "rose",
  }),
  tc({
    id: "demo-cover",
    layout: "cover",
    title: "Chương 2: Làm việc với dữ liệu",
    mainHtml: "<p>Nhập, ép kiểu và tính toán cùng Python</p>",
  }),
  tc({
    id: "demo-twocol",
    layout: "two_col_text",
    title: "Vì sao cần ép kiểu?",
    mainHtml:
      "<p>Khi nhập từ bàn phím, mọi thứ đều là <strong>chuỗi</strong>. Máy tính không thể cộng hai chuỗi như cộng số.</p><p>Ví dụ <code>\"5\" + \"3\"</code> cho ra <code>\"53\"</code> chứ không phải 8.</p><p>Vì vậy ta dùng <code>int()</code> hoặc <code>float()</code> để đổi chuỗi thành số trước khi tính.</p><p>Sau khi ép kiểu, các phép toán cộng, trừ, nhân, chia mới chạy đúng.</p>",
  }),
  tc({
    id: "demo-banner",
    layout: "banner",
    title: "Phần 2 — Luyện tập",
    mainHtml: "<p>Cùng thực hành những gì vừa học nhé!</p>",
    accent: "emerald",
  }),
  tc({
    id: "demo-ratio",
    layout: "code",
    title: "Tỉ lệ cột tùy biến (chữ rộng hơn)",
    mainHtml: "<p>Canvas này dùng <code>ratio: wide-text</code> nên cột chữ rộng hơn cột code.</p>",
    code: 'tuoi = int(input("Tuổi: "))\nprint("Năm sau:", tuoi + 1)',
    ratio: "wide-text",
    steps: steps("input() đọc tuổi dạng chuỗi", "int() ép sang số", "Cộng thêm 1 năm"),
  }),
];

const THEMES = [
  { value: "default", label: "⚪ Mặc định" },
  { value: "ocean", label: "🌊 Ocean" },
  { value: "sunset", label: "🌇 Sunset" },
  { value: "forest", label: "🌲 Forest" },
  { value: "grape", label: "🍇 Grape" },
];

export default function CanvasPreviewPage() {
  const [theme, setTheme] = useState("default");
  const canvases = useMemo(
    () =>
      buildTeachingCanvases({
        id: "demo",
        title: "Demo layout",
        contentBlocks: DEMO_BLOCKS,
      }),
    []
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Xem trước tất cả layout canvas
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Dùng nút ← → (hoặc click) để lướt qua {canvases.length} layout. Slide{" "}
          <strong>Quiz</strong> và <strong>Playground</strong> tương tác trực tiếp —
          bấm đáp án / sửa code rồi Chạy.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Theme cả bài:</span>
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTheme(t.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              theme === t.value
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TeachingCanvasRenderer
        sectionId="demo"
        sectionTitle="Demo layout"
        canvases={canvases}
        media={[]}
        theme={theme}
      />
    </div>
  );
}
