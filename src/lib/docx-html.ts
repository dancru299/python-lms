import mammoth from "mammoth";

function wrapTables(html: string) {
  return html.replace(/<table>([\s\S]*?)<\/table>/gi, (_match, tableContent: string) => {
    return `<div class="docx-table-wrap"><table>${tableContent}</table></div>`;
  });
}

function normalizeDocxHtml(html: string) {
  return wrapTables(
    html
      .replace(/<p>\s*<\/p>/gi, '<p class="docx-empty"></p>')
      .replace(/<p>\s*(<img[\s\S]*?>)\s*<\/p>/gi, '<figure class="docx-image">$1</figure>')
  );
}

export async function convertDocxToHtml(buffer: Buffer) {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      includeDefaultStyleMap: true,
      ignoreEmptyParagraphs: false,
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => p.docx-subtitle:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Quote'] => blockquote:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
      ],
      convertImage: mammoth.images.imgElement((image) =>
        image.read("base64").then((value) => ({
          src: `data:${image.contentType};base64,${value}`,
        }))
      ),
    }
  );

  return {
    html: normalizeDocxHtml(result.value?.trim() || ""),
    messages: result.messages,
  };
}
