import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { btn } from "../lib/ui";

// Installed PWAs and many embedded WebViews have no native PDF plugin, so
// <object>/<embed> silently show "preview unavailable" there even though
// the same tag works in a normal browser tab. Rendering with pdf.js sidesteps
// that entirely - it's pure JS/canvas, no plugin required anywhere.
//
// The worker MUST be same-origin - browsers refuse to construct a Worker
// from a cross-origin URL at all (unlike <script src>), so this can't point
// at a CDN. scripts/copy-pdf-worker.js copies it into public/ on install.
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ""}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  className?: string;
}

export default function PdfViewer({ url, className }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<ReturnType<pdfjsLib.PDFPageProxy["render"]> | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPageNum(1);

    const loadingTask = pdfjsLib.getDocument({ url });
    loadingTaskRef.current = loadingTask;

    loadingTask.promise.then(
      (pdf) => {
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setError("Couldn't load this PDF.");
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      pdfRef.current = null;
      loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || loading) return;

    let cancelled = false;

    pdf.getPage(pageNum).then((page) => {
      if (cancelled) return;
      const containerWidth = containerRef.current?.clientWidth || 800;
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      renderTaskRef.current?.cancel();
      const task = page.render({ canvas, canvasContext: context, viewport });
      renderTaskRef.current = task;
      task.promise.catch(() => {
        // A pending render gets cancelled when the page changes quickly -
        // that's expected and not a real error.
      });
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, loading]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-center p-4">
        <p className="text-sm text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex flex-col items-center ${className || ""}`}>
      {loading ? (
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-border-strong border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex-1 w-full overflow-auto flex justify-center">
            <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" />
          </div>
          {numPages > 1 && (
            <div className="shrink-0 flex items-center gap-3 mt-2 px-3 py-1.5 rounded-lg bg-surface/90 border border-border">
              <button
                onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                disabled={pageNum <= 1}
                className={`px-2 py-1 text-xs ${btn.ghost} disabled:opacity-30`}
              >
                Prev
              </button>
              <span className="text-xs text-muted tabular-nums">
                Page {pageNum} of {numPages}
              </span>
              <button
                onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
                disabled={pageNum >= numPages}
                className={`px-2 py-1 text-xs ${btn.ghost} disabled:opacity-30`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
