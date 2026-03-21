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
        "p:unordered-list(1) => ul.docx-list.docx-list-bullet.docx-list-level-1 > li:fresh",
        "p:unordered-list(2) => ul|ol > li > ul.docx-list.docx-list-bullet.docx-list-level-2 > li:fresh",
        "p:unordered-list(3) => ul|ol > li > ul|ol > li > ul.docx-list.docx-list-bullet.docx-list-level-3 > li:fresh",
        "p:unordered-list(4) => ul|ol > li > ul|ol > li > ul|ol > li > ul.docx-list.docx-list-bullet.docx-list-level-4 > li:fresh",
        "p:unordered-list(5) => ul|ol > li > ul|ol > li > ul|ol > li > ul|ol > li > ul.docx-list.docx-list-bullet.docx-list-level-5 > li:fresh",
        "p:ordered-list(1) => ol.docx-list.docx-list-ordered.docx-list-level-1 > li:fresh",
        "p:ordered-list(2) => ul|ol > li > ol.docx-list.docx-list-ordered.docx-list-level-2 > li:fresh",
        "p:ordered-list(3) => ul|ol > li > ul|ol > li > ol.docx-list.docx-list-ordered.docx-list-level-3 > li:fresh",
        "p:ordered-list(4) => ul|ol > li > ul|ol > li > ul|ol > li > ol.docx-list.docx-list-ordered.docx-list-level-4 > li:fresh",
        "p:ordered-list(5) => ul|ol > li > ul|ol > li > ul|ol > li > ul|ol > li > ol.docx-list.docx-list-ordered.docx-list-level-5 > li:fresh",
        "b => strong",
        "i => em",
        "u => span.docx-underline",
        "strike => s",
        "all-caps => span.docx-all-caps",
        "small-caps => span.docx-small-caps",
        "highlight[color='yellow'] => mark.docx-highlight-yellow",
        "highlight => mark.docx-highlight",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
      ],
      convertImage: mammoth.images.imgElement((image) =>
        image.readAsBase64String().then((value) => ({
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
