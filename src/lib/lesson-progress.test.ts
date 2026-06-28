import { describe, it, expect } from "vitest";
import {
  buildLessonProgressTabs,
  summarizeLessonProgress,
  TAB_COMPLETION_SECONDS,
  type LessonProgressTabRecord,
} from "./lesson-progress";

type LessonSource = Parameters<typeof buildLessonProgressTabs>[0];

const lesson = (
  sections: { id: string; title: string }[],
  exerciseTypes: string[]
): LessonSource =>
  ({
    sections,
    exercises: exerciseTypes.map((type) => ({ type })),
  } as unknown as LessonSource);

describe("buildLessonProgressTabs", () => {
  it("luôn bắt đầu bằng tab Trang chủ", () => {
    const tabs = buildLessonProgressTabs(lesson([], []));
    expect(tabs).toEqual([{ id: "trang-chu", label: "Trang chủ" }]);
  });

  it("thêm tab cho từng section, đánh số 1..n", () => {
    const tabs = buildLessonProgressTabs(
      lesson([{ id: "a", title: "Mở đầu" }, { id: "b", title: "Nội dung" }], [])
    );
    expect(tabs.map((t) => t.id)).toEqual(["trang-chu", "section-a", "section-b"]);
    expect(tabs[1].label).toBe("1. Mở đầu");
    expect(tabs[2].label).toBe("2. Nội dung");
  });

  it("thêm luyen-tap khi có practice, bai-tap khi có homework (đúng thứ tự)", () => {
    const tabs = buildLessonProgressTabs(lesson([], ["practice", "homework"]));
    expect(tabs.map((t) => t.id)).toEqual(["trang-chu", "luyen-tap", "bai-tap"]);
  });

  it("không thêm tab bài tập khi không có exercise tương ứng", () => {
    const tabs = buildLessonProgressTabs(lesson([], ["practice"]));
    expect(tabs.map((t) => t.id)).toEqual(["trang-chu", "luyen-tap"]);
  });
});

describe("summarizeLessonProgress", () => {
  const defs = [
    { id: "trang-chu", label: "Trang chủ" },
    { id: "section-a", label: "1. A" },
  ];

  it("không có record -> tất cả chưa hoàn thành, percent 0", () => {
    const s = summarizeLessonProgress(defs, []);
    expect(s.totalTabs).toBe(2);
    expect(s.completedTabs).toBe(0);
    expect(s.percent).toBe(0);
    expect(s.completed).toBe(false);
    expect(s.timeSpent).toBe(0);
    expect(s.tabs[0].remainingSeconds).toBe(TAB_COMPLETION_SECONDS);
  });

  it("hoàn thành một phần -> percent làm tròn, cộng timeSpent", () => {
    const records: LessonProgressTabRecord[] = [
      { tabId: "trang-chu", timeSpent: 60, completed: true },
      { tabId: "section-a", timeSpent: 20, completed: false },
    ];
    const s = summarizeLessonProgress(defs, records);
    expect(s.completedTabs).toBe(1);
    expect(s.percent).toBe(50);
    expect(s.completed).toBe(false);
    expect(s.timeSpent).toBe(80);
    expect(s.tabs[1].remainingSeconds).toBe(TAB_COMPLETION_SECONDS - 20);
  });

  it("hoàn thành hết -> completed=true, percent 100", () => {
    const records: LessonProgressTabRecord[] = defs.map((d) => ({
      tabId: d.id,
      timeSpent: 60,
      completed: true,
    }));
    const s = summarizeLessonProgress(defs, records);
    expect(s.completed).toBe(true);
    expect(s.percent).toBe(100);
    expect(s.tabs.every((t) => t.remainingSeconds === 0)).toBe(true);
  });

  it("không có tab nào -> completed=false, percent 0", () => {
    const s = summarizeLessonProgress([], []);
    expect(s.completed).toBe(false);
    expect(s.percent).toBe(0);
    expect(s.totalTabs).toBe(0);
  });

  it("record dư (tab không tồn tại) bị bỏ qua", () => {
    const s = summarizeLessonProgress(defs, [
      { tabId: "khong-ton-tai", timeSpent: 999, completed: true },
    ]);
    expect(s.completedTabs).toBe(0);
    expect(s.timeSpent).toBe(0);
  });
});
