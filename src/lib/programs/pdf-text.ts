import "server-only";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

function ensurePdfJsNodePolyfills() {
  if (typeof globalThis.DOMMatrix !== "undefined") {
    return;
  }

  const geometry = require("@napi-rs/canvas/geometry") as {
    DOMMatrix?: typeof DOMMatrix;
  };

  if (!geometry.DOMMatrix) {
    throw new Error("Khong the nap DOMMatrix polyfill cho PDF parser.");
  }

  globalThis.DOMMatrix = geometry.DOMMatrix;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  ensurePdfJsNodePolyfills();

  const [pdfjs, pdfWorker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);
  globalThis.pdfjsWorker = pdfWorker;

  const documentTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  });
  const pdf = await documentTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let line = "";

    for (const item of content.items as Array<{ str?: string; hasEOL?: boolean }>) {
      const text = item.str?.trim();
      if (text) {
        line = line ? `${line} ${text}` : text;
      }

      if (item.hasEOL && line) {
        lines.push(line);
        line = "";
      }
    }

    if (line) {
      lines.push(line);
    }

    pages.push(lines.join("\n"));
  }

  return pages.join("\n").trim();
}
