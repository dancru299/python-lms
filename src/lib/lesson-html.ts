export function processCodeBlocks(html: string): string {
  if (!html) return html;

  return html.replace(
    /<div\s+class="code-block">([\s\S]*?)<\/div>/gi,
    (_, content: string) => {
      const trimmed = content.replace(/^[\s\n]+/, "").replace(/[\s\n]+$/, "");
      const highlighted = highlightComments(trimmed);
      return `<div class="code-block">${highlighted}</div>`;
    }
  );
}

export function renderExerciseHtml(content: string): string {
  return processCodeBlocks(normalizeExerciseHtml(content));
}

function highlightComments(code: string): string {
  const lines = code.split("\n");

  return lines
    .map((line) => {
      const hashIdx = line.indexOf("#");
      if (hashIdx !== -1) {
        const before = line.substring(0, hashIdx);
        const comment = line.substring(hashIdx);
        return `${before}<span class="code-comment">${comment}</span>`;
      }

      return line;
    })
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, (match) => `<span class="code-comment">${match}</span>`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInlineContent(text: string): string {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function normalizeExerciseHtml(content: string): string {
  if (!content?.trim()) return "";

  const trimmed = content.trim();
  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  let normalized = trimmed.replace(/\r\n/g, "\n");
  const codeBlocks: string[] = [];

  normalized = normalized.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (_, code: string) => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<div class="code-block">${escapeHtml(code.trim())}</div>`);
    return `\n${token}\n`;
  });

  const html = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^__CODE_BLOCK_\d+__$/.test(block)) {
        return block;
      }

      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length > 0 && lines.every((line) => /^\d+[\.\)]\s+/.test(line))) {
        return `<ol>${lines
          .map((line) => `<li>${formatInlineContent(line.replace(/^\d+[\.\)]\s+/, ""))}</li>`)
          .join("")}</ol>`;
      }

      if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines
          .map((line) => `<li>${formatInlineContent(line.replace(/^[-*]\s+/, ""))}</li>`)
          .join("")}</ul>`;
      }

      return `<p>${formatInlineContent(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  return html.replace(
    /__CODE_BLOCK_(\d+)__/g,
    (_, index: string) => codeBlocks[Number(index)] || ""
  );
}
