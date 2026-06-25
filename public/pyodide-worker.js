/* eslint-disable */
// Classic Web Worker that runs student Python via Pyodide OFF the main thread.
// Loading + compiling the ~10MB WASM and executing code happen here, so the page
// UI never freezes (no "This page isn't responding"). Served as a static file from
// /public so it works identically in dev and on Vercel, with no bundler involvement.

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/";

let pyodideReadyPromise = null;

function loadPyodideOnce() {
  if (pyodideReadyPromise) return pyodideReadyPromise;
  // importScripts is available in classic workers and can load a cross-origin CDN script.
  importScripts(`${PYODIDE_CDN}pyodide.js`);
  // `loadPyodide` is exposed on the worker global scope by pyodide.js.
  pyodideReadyPromise = loadPyodide({ indexURL: PYODIDE_CDN });
  return pyodideReadyPromise;
}

self.onmessage = async (event) => {
  const { id, code } = event.data || {};

  try {
    self.postMessage({ id, type: "status", status: "loading" });
    const pyodide = await loadPyodideOnce();
    self.postMessage({ id, type: "status", status: "running" });

    // Redirect stdout/stderr into a buffer we can read back after execution.
    pyodide.runPython("import sys, io\nsys.stdout = io.StringIO()\nsys.stderr = sys.stdout\n");

    // Chạy code học sinh trong MỘT namespace mới tinh mỗi lần. Worker là singleton
    // (giữ WASM nặng ~10MB), nhưng nếu dùng chung global namespace thì biến của slide
    // trước (vd x = 10) còn sót lại, khiến code thiếu khai báo vẫn "chạy đúng ảo" ở
    // slide sau. Globals riêng cho mỗi lần chạy chặn đứng việc nhiễm độc đó.
    const globals = pyodide.runPython("dict()");
    let error = null;
    try {
      await pyodide.runPythonAsync(code ?? "", { globals });
    } catch (e) {
      error = e && e.message ? e.message : String(e);
    } finally {
      globals.destroy();
    }

    const output = pyodide.runPython("sys.stdout.getvalue()");
    self.postMessage({ id, type: "result", output, error });
  } catch (e) {
    // Failed before/while loading Pyodide (e.g. CDN unreachable).
    self.postMessage({
      id,
      type: "result",
      error: e && e.message ? e.message : String(e),
      fatal: true,
    });
  }
};
