"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInstance>;
    _pyodideInstance?: PyodideInstance;
    _pyodideLoading?: Promise<PyodideInstance>;
  }
}

interface PyodideInstance {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
}

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/";

async function getPyodide(): Promise<PyodideInstance> {
  if (window._pyodideInstance) return window._pyodideInstance;
  if (window._pyodideLoading) return window._pyodideLoading;

  window._pyodideLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PYODIDE_CDN}pyodide.js`;
    script.onload = async () => {
      try {
        const py = await window.loadPyodide!({ indexURL: PYODIDE_CDN });
        window._pyodideInstance = py;
        resolve(py);
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return window._pyodideLoading;
}

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
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideStatus, setPyodideStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const pyodideRef = useRef<PyodideInstance | null>(null);

  useEffect(() => {
    if (readOnly) return;
    setPyodideStatus("loading");
    getPyodide()
      .then((py) => {
        pyodideRef.current = py;
        setPyodideStatus("ready");
      })
      .catch(() => {
        setPyodideStatus("failed");
      });
  }, [readOnly]);

  const handleEditorChange = (value: string | undefined) => {
    const v = value ?? "";
    setCode(v);
    onChange(v);
  };

  const runCode = async () => {
    const py = pyodideRef.current;
    if (!py || isRunning) return;

    setIsRunning(true);
    setOutput(null);

    try {
      py.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = sys.stdout
`);
      await py.runPythonAsync(code);
      const stdout = py.runPython("sys.stdout.getvalue()") as string;
      setOutput(stdout || "(Không có output)");
      setOutputType("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOutput(msg);
      setOutputType("error");
    } finally {
      setIsRunning(false);
    }
  };

  const runLabel = () => {
    if (isRunning) return <><i className="fa-solid fa-spinner fa-spin"></i> Đang chạy…</>;
    if (pyodideStatus === "loading") return <><i className="fa-solid fa-spinner fa-spin"></i> Đang tải Python…</>;
    if (pyodideStatus === "failed") return <><i className="fa-solid fa-triangle-exclamation"></i> Lỗi tải Python</>;
    return <><i className="fa-solid fa-play"></i> Chạy</>;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700 bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">Python 3</span>
          {pyodideStatus === "ready" && (
            <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              sandbox sẵn sàng
            </span>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={runCode}
            disabled={pyodideStatus !== "ready" || isRunning}
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
