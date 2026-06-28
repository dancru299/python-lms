import type { TeachingCanvas } from "@/lib/lessons/teaching-canvas";

/** Bỏ tag HTML, gộp khoảng trắng — lấy phần text thuần để so khớp / đo độ dài. */
export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/["'`]/g, "").replace(/\s+/g, " ").trim();
}

/* How strongly a code line is referenced by a step's text. A step usually quotes
   the line it explains ("…print(\"Kết thúc kỳ học.\") → …"), so a direct quote is
   the most reliable signal; otherwise fall back to token overlap. */
function codeLineMatchScore(codeLine: string, stepText: string): number {
  const chunk = normalizeForMatch(codeLine).replace(/:$/, "").trim();
  if (chunk.length < 3) return 0;
  const step = normalizeForMatch(stepText);
  if (chunk.length >= 5 && step.includes(chunk)) return chunk.length;
  const tokens = chunk.split(/[^a-z0-9_]+/).filter((token) => token.length >= 3);
  if (tokens.length < 2) return 0;
  const matched = tokens.filter((token) => step.includes(token)).length;
  return matched >= 2 && matched / tokens.length >= 0.6 ? matched : 0;
}

/* Maps each code_explain step to the index of the code line it describes:
   1) the line it quotes (content match), 2) an explicit "Dòng N" number, else
   3) the next not-yet-used line (sequential). Keeps the popover label and the
   highlighted line consistent with the step's actual content. */
export function resolveCodeExplainLineIndexes(
  notes: TeachingCanvas["steps"],
  lines: string[]
): number[] {
  const explainable = lines
    .map((line, index) => ({ line, index }))
    .filter((entry) => entry.line.trim().length > 0);
  if (explainable.length === 0) return notes.map(() => 0);

  let cursor = 0;
  return notes.map((note) => {
    const text = note.text || stripTags(note.html || "");

    let target: number;
    // 1) Marker "Dòng N" = ý tác giả chỉ rõ → ưu tiên TRƯỚC so-trùng-token. Token
    //    mờ dễ neo nhầm khi nhiều dòng dùng chung từ khoá (elif/diem/print) hoặc khi
    //    chữ Việt bị tách vụn, gây nhảy ngược/đánh dấu sai dòng.
    const explicit = text.match(/(?:dòng|dong|line|câu lệnh)\s*(\d+)/i);
    if (explicit) {
      target = Math.max(0, Math.min(parseInt(explicit[1], 10) - 1, lines.length - 1));
    } else {
      // 2) Không có marker → so trùng nội dung (trích dẫn/token) với dòng code.
      let best = -1;
      let bestScore = 0;
      for (const { line, index } of explainable) {
        const score = codeLineMatchScore(line, text);
        if (score > bestScore) {
          bestScore = score;
          best = index;
        }
      }
      // 3) Vẫn không khớp → dòng kế tiếp chưa dùng (tuần tự).
      target =
        best >= 0 ? best : explainable[Math.min(cursor, explainable.length - 1)].index;
    }

    const position = explainable.findIndex((entry) => entry.index === target);
    cursor = position >= 0 ? position + 1 : cursor + 1;
    return target;
  });
}
