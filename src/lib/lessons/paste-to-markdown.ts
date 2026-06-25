import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

// Chuyển HTML từ clipboard (Word/Google Docs/web) sang Markdown để giữ CẤU TRÚC khi
// dán vào ô nguồn AI — thay vì textarea san phẳng mất bảng/list/heading/đậm. LLM đọc
// Markdown rất tốt, và code nằm trong khối ``` ``` được giữ nguyên indent + nháy thẳng,
// tránh lỗi cú pháp Python do editor làm hỏng.

let service: TurndownService | null = null;

function getService(): TurndownService {
  if (service) return service;
  const turndown = new TurndownService({
    headingStyle: "atx", // # Heading
    bulletListMarker: "-",
    codeBlockStyle: "fenced", // ```code```
    fence: "```",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });
  turndown.use(gfm); // bảng, gạch ngang, task list
  service = turndown;
  return turndown;
}

// Có đáng chuyển sang Markdown không? Chỉ chặn paste khi HTML mang cấu trúc thực sự
// (bảng/list/heading/đậm/code). HTML "trơn" (vd code tô màu từ IDE chỉ gồm <span
// style>) → trả false để giữ paste text thuần, bảo toàn code nguyên vẹn.
export function htmlHasStructure(html: string): boolean {
  return /<(table|thead|tbody|tr|th|td|ul|ol|li|h[1-6]|strong|em|b|i|blockquote|pre|code)\b/i.test(
    html
  );
}

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return "";
  try {
    return getService().turndown(html).trim();
  } catch {
    return "";
  }
}
