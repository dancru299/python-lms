// Heuristic, dependency-free Python syntax sniffer. KHÔNG phải parser đầy đủ — môi
// trường serverless (Vercel) không có Python runtime để compile thật. Mục tiêu: bắt
// vài lỗi cú pháp phổ biến mà LLM hay tạo (thiếu ":", lệch ngoặc, chuỗi chưa đóng,
// trộn tab/space) với TỈ LỆ BÁO NHẦM THẤP, để cảnh báo giáo viên trước khi học sinh
// bấm chạy và gặp crash. Khi không chắc thì im lặng (thà bỏ sót còn hơn báo bừa).

const COMPOUND_KEYWORD =
  /^(if|elif|else|for|while|def|class|try|except|finally|with)\b|^async\s+(def|for|with)\b/;

interface ScannedLine {
  cleaned: string; // đã thay nội dung chuỗi + comment bằng khoảng trắng, giữ cấu trúc
  startDepth: number; // độ sâu ngoặc khi bắt đầu dòng
  endDepth: number; // độ sâu ngoặc khi kết thúc dòng (>0 => câu lệnh nối sang dòng sau)
  endsWithBackslash: boolean;
  rawIndent: string; // phần khoảng trắng đầu dòng (để soi trộn tab/space)
}

interface PythonScan {
  lines: ScannedLine[];
  finalDepth: number; // != 0 => lệch ngoặc trên toàn đoạn
  unterminatedString: boolean; // chuỗi 3 nháy mở mà không đóng tới hết đoạn
  badSingleLineString: boolean; // chuỗi 1 nháy không đóng trong cùng dòng
}

const OPENERS = new Set(["(", "[", "{"]);
const CLOSERS = new Set([")", "]", "}"]);

// Máy trạng thái nhỏ: bỏ comment (#), bỏ nội dung chuỗi ('...', "...", '''...''',
// """...""") và đếm ngoặc bên ngoài chuỗi. Trả về thông tin theo từng dòng.
function scanPython(code: string): PythonScan {
  const lines: ScannedLine[] = [];
  let depth = 0;
  // Trạng thái chuỗi mang qua các dòng (chuỗi 3 nháy có thể nhiều dòng).
  let stringQuote: '"' | "'" | null = null;
  let stringTriple = false;
  let badSingleLineString = false;

  const rawLines = code.split(/\r?\n/);

  for (const raw of rawLines) {
    const startDepth = depth;
    let cleaned = "";
    let i = 0;

    while (i < raw.length) {
      const ch = raw[i];

      if (stringQuote) {
        // Đang trong chuỗi: tìm điểm đóng, bỏ qua ký tự thoát.
        if (ch === "\\") {
          i += 2;
          cleaned += "  ";
          continue;
        }
        if (stringTriple) {
          if (ch === stringQuote && raw.slice(i, i + 3) === stringQuote.repeat(3)) {
            stringQuote = null;
            stringTriple = false;
            cleaned += "   ";
            i += 3;
            continue;
          }
        } else if (ch === stringQuote) {
          stringQuote = null;
          cleaned += " ";
          i += 1;
          continue;
        }
        cleaned += " ";
        i += 1;
        continue;
      }

      if (ch === "#") {
        // Comment: bỏ phần còn lại của dòng.
        break;
      }

      if (ch === '"' || ch === "'") {
        if (raw.slice(i, i + 3) === ch.repeat(3)) {
          stringQuote = ch;
          stringTriple = true;
          cleaned += "   ";
          i += 3;
          continue;
        }
        stringQuote = ch;
        stringTriple = false;
        cleaned += " ";
        i += 1;
        continue;
      }

      if (OPENERS.has(ch)) depth += 1;
      else if (CLOSERS.has(ch)) depth = Math.max(0, depth - 1);

      cleaned += ch;
      i += 1;
    }

    // Chuỗi 1 nháy không được xuống dòng (trừ khi có "\" nối). Đóng ảo ở cuối dòng
    // để trạng thái không rò sang dòng sau; nếu không có "\" nối thì là lỗi.
    const endsWithBackslash = !stringQuote && /\\\s*$/.test(raw);
    if (stringQuote && !stringTriple) {
      if (!/\\\s*$/.test(raw)) {
        badSingleLineString = true;
      }
      stringQuote = null;
    }

    lines.push({
      cleaned,
      startDepth,
      endDepth: depth,
      endsWithBackslash,
      rawIndent: raw.match(/^[ \t]*/)?.[0] ?? "",
    });
  }

  return {
    lines,
    finalDepth: depth,
    unterminatedString: stringQuote !== null && stringTriple,
    badSingleLineString,
  };
}

function shorten(line: string, max = 48): string {
  const text = line.trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// Heuristic "trông giống Python": dùng để tránh chạy linter trên đáp án văn xuôi
// thuần (vd lời giải thích bằng tiếng Việt) gây báo nhầm.
export function looksLikePython(code: string): boolean {
  if (!code) return false;
  return /(^|\n)\s*(def|class|for|while|if|elif|else|import|from|return|print|with|try)\b/.test(
    code
  ) || /[=:]\s*\S/.test(code);
}

// Trả về danh sách mô tả lỗi cú pháp khả nghi (tiếng Việt). Rỗng = không thấy lỗi rõ.
export function findPythonSyntaxIssues(code: string): string[] {
  const issues: string[] = [];
  if (!code || !code.trim()) return issues;

  const scan = scanPython(code);

  if (scan.finalDepth > 0) {
    issues.push("Thiếu dấu đóng ngoặc ) ] }.");
  } else if (scan.finalDepth < 0) {
    issues.push("Thừa dấu đóng ngoặc ) ] }.");
  }
  if (scan.unterminatedString) {
    issues.push("Có chuỗi nhiều dòng (''' hoặc \"\"\") chưa đóng.");
  }
  if (scan.badSingleLineString) {
    issues.push("Có chuỗi (dấu nháy ' hoặc \") chưa đóng trong dòng.");
  }

  // Thiếu ":" cuối câu lệnh khối — chỉ xét dòng gọn trên MỘT dòng vật lý (start &
  // end đều ở depth 0) để không báo nhầm với điều kiện trải nhiều dòng trong ngoặc.
  scan.lines.forEach((line, index) => {
    const trimmed = line.cleaned.trim();
    if (!trimmed) return;
    if (line.startDepth !== 0 || line.endDepth !== 0) return;
    if (line.endsWithBackslash) return;
    if (!COMPOUND_KEYWORD.test(trimmed)) return;
    if (!trimmed.endsWith(":")) {
      issues.push(`Dòng ${index + 1} ("${shorten(trimmed)}") có thể thiếu dấu ":" ở cuối.`);
    }
  });

  // Trộn tab và space để thụt lề trong cùng đoạn → dễ gây TabError/IndentationError.
  const hasTabIndent = scan.lines.some((l) => /^\t/.test(l.rawIndent) && l.cleaned.trim());
  const hasSpaceIndent = scan.lines.some((l) => /^ /.test(l.rawIndent) && l.cleaned.trim());
  if (hasTabIndent && hasSpaceIndent) {
    issues.push("Trộn lẫn tab và dấu cách để thụt lề (dễ gây IndentationError).");
  }

  // Giới hạn số lượng để báo cáo gọn.
  return issues.slice(0, 6);
}
