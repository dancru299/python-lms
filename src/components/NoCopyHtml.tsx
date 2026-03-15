"use client";

interface Props {
  html: string;
}

export default function NoCopyHtml({ html }: Props) {
  return (
    <div
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      className="select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

