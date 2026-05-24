"use client";

import dynamic from "next/dynamic";

const PythonCodeEditor = dynamic(() => import("@/components/PythonCodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center rounded-xl border border-gray-700 bg-[#1e1e1e] text-sm text-gray-400">
      <i className="fa-solid fa-spinner fa-spin mr-2"></i>Dang tai...
    </div>
  ),
});

interface ReadOnlyPythonCodeEditorProps {
  defaultValue: string;
}

export default function ReadOnlyPythonCodeEditor({
  defaultValue,
}: ReadOnlyPythonCodeEditorProps) {
  return (
    <PythonCodeEditor
      defaultValue={defaultValue}
      onChange={() => undefined}
      readOnly
    />
  );
}
