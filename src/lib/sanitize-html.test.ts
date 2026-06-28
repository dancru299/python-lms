import { describe, it, expect } from "vitest";
import { sanitizeLessonHtml } from "./sanitize-html";

describe("sanitizeLessonHtml", () => {
  it("giữ nguyên chuỗi rỗng", () => {
    expect(sanitizeLessonHtml("")).toBe("");
    expect(sanitizeLessonHtml("   ")).toBe("");
  });

  it("giữ lại các thẻ được phép và nội dung", () => {
    const out = sanitizeLessonHtml("<p>Xin <strong>chào</strong></p>");
    expect(out).toContain("<p>");
    expect(out).toContain("<strong>");
    expect(out).toContain("chào");
  });

  it("xóa thẻ <script>", () => {
    const out = sanitizeLessonHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("ok");
  });

  it("xóa thuộc tính sự kiện on* (chống XSS)", () => {
    const out = sanitizeLessonHtml('<p onclick="steal()">hi</p>');
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("steal()");
    expect(out).toContain("hi");
  });

  it("chặn href javascript:", () => {
    const out = sanitizeLessonHtml('<a href="javascript:alert(1)">x</a>');
    expect(out.toLowerCase()).not.toContain("javascript:");
  });

  it("chặn src data:", () => {
    const out = sanitizeLessonHtml('<img src="data:text/html;base64,AAAA" alt="x">');
    expect(out).not.toContain("data:");
  });

  it("giữ href http hợp lệ", () => {
    const out = sanitizeLessonHtml('<a href="https://python.org">py</a>');
    expect(out).toContain("https://python.org");
  });

  it("loại token class kiểu Tailwind nhưng giữ class ngữ nghĩa", () => {
    const out = sanitizeLessonHtml(
      '<div class="bg-blue-500 p-4 code-block lesson-media">x</div>'
    );
    expect(out).toContain("code-block");
    expect(out).toContain("lesson-media");
    expect(out).not.toContain("bg-blue-500");
    expect(out).not.toContain("p-4");
  });

  it("giữ thuộc tính data-* nằm trong allowlist", () => {
    const out = sanitizeLessonHtml('<span data-media-id="m1">x</span>');
    expect(out).toContain('data-media-id="m1"');
  });

  it("xóa thẻ không nằm trong allowlist (vd iframe)", () => {
    const out = sanitizeLessonHtml('<iframe src="https://evil.com"></iframe>');
    expect(out).not.toContain("<iframe");
  });
});
