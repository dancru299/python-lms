import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import { parseEbookOutlineText } from "@/lib/programs/ebook-curriculum";
import { extractPdfText } from "@/lib/programs/pdf-text";

const MAX_PDF_BYTES = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const contentType = request.headers.get("content-type") || "";
    let sourceText = "";
    let source: "text" | "pdf" = "text";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const pastedText = formData.get("text");

      if (typeof pastedText === "string" && pastedText.trim()) {
        sourceText = pastedText;
      } else if (file && typeof file !== "string") {
        source = "pdf";
        if (file.size > MAX_PDF_BYTES) {
          return NextResponse.json(
            { error: "PDF vuot qua gioi han 100MB." },
            { status: 400 }
          );
        }

        if (
          file.type !== "application/pdf" &&
          !file.name.toLowerCase().endsWith(".pdf")
        ) {
          return NextResponse.json(
            { error: "Chi ho tro file PDF trong V1." },
            { status: 400 }
          );
        }

        sourceText = await extractPdfText(Buffer.from(await file.arrayBuffer()));
      }
    } else {
      const body = await request.json().catch(() => ({}));
      sourceText = typeof body.text === "string" ? body.text : "";
    }

    if (!sourceText.trim()) {
      if (source === "pdf") {
        return NextResponse.json(
          {
            error:
              "PDF da upload thanh cong nhung khong trich xuat duoc text. File nay co the la PDF scan anh, bi khoa, hoac text khong doc duoc. V1 chua ho tro OCR, hay paste muc luc ebook vao o nhap.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Khong trich xuat duoc text. Hay paste muc luc ebook vao o nhap." },
        { status: 400 }
      );
    }

    const outline = parseEbookOutlineText(sourceText);
    if (outline.length === 0) {
      return NextResponse.json(
        { error: "Khong nhan dien duoc muc luc. Hay kiem tra lai dinh dang text." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      outline,
      rawText: sourceText,
      sourceText,
      meta: {
        source,
        itemCount: outline.length,
      },
      stats: {
        rootItems: outline.length,
        lessons: outline.reduce((sum, item) => sum + item.children.length, 0),
      },
    });
  } catch (error) {
    console.error("Parse ebook outline error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Khong the parse muc luc ebook.",
      },
      { status: 500 }
    );
  }
}
