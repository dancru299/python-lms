// Main-thread client for the Pyodide Web Worker (public/pyodide-worker.js).
//
// A single worker is shared across every PythonCodeEditor on the page, so only one
// Pyodide runtime is ever loaded (low memory). Each run gets an id so concurrent
// editors don't mix up their results. All heavy work runs in the worker, keeping the
// UI thread responsive.

export type RunStatus = "loading" | "running";

export interface RunResult {
  output?: string;
  error?: string;
}

interface PendingRun {
  resolve: (result: RunResult) => void;
  onStatus?: (status: RunStatus) => void;
}

const RUN_TIMEOUT_MS = 60_000;

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, PendingRun>();

function failAll(message: string) {
  for (const [, entry] of pending) entry.resolve({ error: message });
  pending.clear();
  // Drop the worker so the next run starts a fresh one.
  worker?.terminate();
  worker = null;
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker("/pyodide-worker.js");

  worker.onmessage = (event: MessageEvent) => {
    const data = event.data ?? {};
    const entry = pending.get(data.id);
    if (!entry) return;

    if (data.type === "status") {
      entry.onStatus?.(data.status as RunStatus);
      return;
    }

    if (data.type === "result") {
      pending.delete(data.id);
      entry.resolve({ output: data.output, error: data.error });
      if (data.fatal) {
        // Loading Pyodide failed; reset so a retry re-creates the worker.
        worker?.terminate();
        worker = null;
      }
    }
  };

  worker.onerror = () => failAll("Trình chạy Python gặp lỗi. Hãy bấm Chạy lại.");

  return worker;
}

export function runPython(code: string, onStatus?: (status: RunStatus) => void): Promise<RunResult> {
  const w = getWorker();
  const id = nextId++;

  return new Promise<RunResult>((resolve) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) {
        resolve({ error: "Quá thời gian chờ chạy Python (60 giây)." });
      }
    }, RUN_TIMEOUT_MS);

    pending.set(id, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      onStatus,
    });

    w.postMessage({ id, code });
  });
}
