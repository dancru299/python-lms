"use client";

import type { ClipboardEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import NoCopyHtml from "@/components/NoCopyHtml";

interface Props {
  docxBase64?: string | null;
  html?: string | null;
  protectContent?: boolean;
}

function decodeBase64ToUint8Array(base64: string) {
  const cleaned = base64.replace(/\s+/g, "");
  const binary = window.atob(cleaned);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export default function AssignmentQuestionPreview({
  docxBase64,
  html,
  protectContent = false,
}: Props) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [docxStatus, setDocxStatus] = useState<"idle" | "loading" | "ready" | "error">(
    docxBase64 ? "loading" : "idle",
  );

  useEffect(() => {
    if (!docxBase64 || !previewRef.current) {
      setDocxStatus("idle");
      return;
    }

    let cancelled = false;
    const container = previewRef.current;
    container.innerHTML = "";
    setDocxStatus("loading");

    (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        if (cancelled || !previewRef.current) {
          return;
        }

        await renderAsync(decodeBase64ToUint8Array(docxBase64), previewRef.current, undefined, {
          className: "assignment-docx",
          inWrapper: true,
          useBase64URL: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderHeaders: true,
          renderFooters: true,
          ignoreLastRenderedPageBreak: false,
          breakPages: true,
          experimental: true,
        });

        if (!cancelled) {
          setDocxStatus("ready");
        }
      } catch (error) {
        console.error("Render DOCX preview error:", error);
        if (!cancelled) {
          if (previewRef.current) {
            previewRef.current.innerHTML = "";
          }
          setDocxStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [docxBase64]);

  const interactionGuards = protectContent
    ? {
        onCopy: (event: ClipboardEvent<HTMLDivElement>) => event.preventDefault(),
        onCut: (event: ClipboardEvent<HTMLDivElement>) => event.preventDefault(),
        onContextMenu: (event: MouseEvent<HTMLDivElement>) => event.preventDefault(),
      }
    : {};

  const guardStyle = protectContent
    ? {
        userSelect: "none" as const,
        WebkitUserSelect: "none" as const,
      }
    : undefined;

  return (
    <div
      {...interactionGuards}
      className={protectContent ? "select-none" : undefined}
      style={guardStyle}
    >
      {docxBase64 ? (
        <>
          {docxStatus === "loading" && (
            <div className="mb-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-700">
              Đang dựng đề bài từ file Word...
            </div>
          )}
          <div ref={previewRef} className="assignment-docx-preview min-h-[70vh]" />
          {docxStatus === "error" && html && (
            <div className="mt-4">
              {protectContent ? (
                <NoCopyHtml html={html} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: html }} />
              )}
            </div>
          )}
          {docxStatus === "error" && !html && (
            <p className="text-sm text-red-600">
              Không thể hiển thị bản xem từ file Word.
            </p>
          )}
        </>
      ) : html ? (
        protectContent ? (
          <NoCopyHtml html={html} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )
      ) : (
        <p>Chưa có nội dung đề bài.</p>
      )}
    </div>
  );
}
