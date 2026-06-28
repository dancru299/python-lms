import { describe, it, expect } from "vitest";
import { stripTags, resolveCodeExplainLineIndexes } from "./code-explain";

type Note = { id?: string; text?: string; html?: string };
// resolveCodeExplainLineIndexes chỉ đọc note.text / note.html nên ép kiểu cho gọn.
const notes = (arr: Note[]) => arr as unknown as Parameters<typeof resolveCodeExplainLineIndexes>[0];

describe("stripTags", () => {
  it("bỏ tag và gộp khoảng trắng", () => {
    expect(stripTags("<p>Xin  chào</p>")).toBe("Xin chào");
  });
  it("đổi &nbsp; thành khoảng trắng", () => {
    expect(stripTags("a&nbsp;b")).toBe("a b");
  });
  it("chuỗi rỗng -> rỗng", () => {
    expect(stripTags("")).toBe("");
  });
});

describe("resolveCodeExplainLineIndexes", () => {
  const code = [
    "x = 10",
    "if x > 5:",
    '    print("lớn")',
    "else:",
    '    print("nhỏ")',
  ];

  it("trả mảng cùng độ dài với số note", () => {
    const result = resolveCodeExplainLineIndexes(
      notes([{ text: "a" }, { text: "b" }, { text: "c" }]),
      code
    );
    expect(result).toHaveLength(3);
  });

  it("marker 'Dòng N' neo đúng dòng (N-1, clamp trong phạm vi)", () => {
    const result = resolveCodeExplainLineIndexes(
      notes([{ text: "Dòng 2 kiểm tra điều kiện" }]),
      code
    );
    expect(result[0]).toBe(1); // "Dòng 2" -> index 1
  });

  it("clamp marker vượt quá số dòng về dòng cuối", () => {
    const result = resolveCodeExplainLineIndexes(notes([{ text: "Dòng 999" }]), code);
    expect(result[0]).toBe(code.length - 1);
  });

  it("không marker -> khớp theo nội dung trích dẫn", () => {
    const result = resolveCodeExplainLineIndexes(
      notes([{ text: 'lệnh print("nhỏ") in ra khi sai' }]),
      code
    );
    expect(result[0]).toBe(4); // dòng print("nhỏ")
  });

  it("code toàn dòng trống -> tất cả về 0 (không lỗi)", () => {
    const result = resolveCodeExplainLineIndexes(
      notes([{ text: "x" }, { text: "y" }]),
      ["", "   ", ""]
    );
    expect(result).toEqual([0, 0]);
  });

  it("dùng html khi không có text (qua stripTags)", () => {
    const result = resolveCodeExplainLineIndexes(
      notes([{ html: "<b>Dòng 3</b> in kết quả" }]),
      code
    );
    expect(result[0]).toBe(2);
  });
});
