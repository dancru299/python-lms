"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { runPython } from "@/lib/python/pyodide-client";

interface PythonCodeEditorProps {
  defaultValue?: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}

export default function PythonCodeEditor({
  defaultValue = 'print("Hello, Python!")',
  onChange,
  readOnly = false,
}: PythonCodeEditorProps) {
  const [code, setCode] = useState(defaultValue);
  const [output, setOutput] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<"success" | "error">("success");
  // Phase of the current run. Python (Pyodide) runs in a Web Worker so the page never
  // freezes: loading the ~10MB runtime and executing code both happen off the main thread.
  const [phase, setPhase] = useState<"idle" | "loading" | "running">("idle");
  const isBusy = phase !== "idle";

  const handleEditorChange = (value: string | undefined) => {
    const v = value ?? "";
    setCode(v);
    onChange(v);
  };

  const runCode = async () => {
    if (isBusy) return;

    setPhase("loading");
    setOutput(null);

    const result = await runPython(code, (status) => setPhase(status));

    if (result.error) {
      setOutput(result.error);
      setOutputType("error");
    } else {
      setOutput(result.output || "(Không có output)");
      setOutputType("success");
    }

    setPhase("idle");
  };

  const runLabel = () => {
    if (phase === "running") return <><i className="fa-solid fa-spinner fa-spin"></i> Đang chạy…</>;
    if (phase === "loading") return <><i className="fa-solid fa-spinner fa-spin"></i> Đang tải Python…</>;
    return <><i className="fa-solid fa-play"></i> Chạy</>;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700 bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">Python 3</span>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={runCode}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runLabel()}
          </button>
        )}
      </div>

      {/* Monaco editor */}
      <Editor
        height="280px"
        language="python"
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace",
          padding: { top: 12, bottom: 12 },
          readOnly,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: "on",
          renderLineHighlight: "line",
        }}
      />

      {/* Output panel */}
      {output !== null && (
        <div className="border-t border-gray-700 bg-gray-950 px-4 py-3">
          <div className="mb-1.5 flex items-center gap-2">
            <i
              className={`fa-solid text-xs ${
                outputType === "error"
                  ? "fa-circle-exclamation text-red-400"
                  : "fa-terminal text-emerald-400"
              }`}
            ></i>
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {outputType === "error" ? "Lỗi" : "Output"}
            </span>
          </div>
          <pre
            className={`whitespace-pre-wrap font-mono text-sm leading-relaxed ${
              outputType === "error" ? "text-red-400" : "text-emerald-300"
            }`}
          >
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
