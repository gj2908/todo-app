import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../axiosConfig";
import { btn } from "../lib/ui";
import PdfViewer from "../components/PdfViewer";

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M10 3.5L5 8l5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

interface VaultDocument {
  _id: string;
  title: string;
  originalName: string;
  fileType: "image" | "pdf";
  url: string;
  bytes: number;
  createdAt: string;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

export default function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<VaultDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsDoc = document as FullscreenDocument;
      setIsFullscreen(Boolean(document.fullscreenElement || fsDoc.webkitFullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const fsDoc = document as FullscreenDocument;
    const isCurrentlyFullscreen = Boolean(document.fullscreenElement || fsDoc.webkitFullscreenElement);

    if (isCurrentlyFullscreen) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (fsDoc.webkitExitFullscreen) fsDoc.webkitExitFullscreen();
      return;
    }

    const el = previewRef.current as FullscreenElement | null;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) {
        setError("Missing document ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`/documents/${documentId}`);
        setDoc(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Document not found or you do not have access.");
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-page text-text flex items-center justify-center">
        <p className="text-sm text-muted">Loading document...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-page text-text flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-border bg-surface p-5 text-center">
          <p className="text-sm text-red-400">{error || "Unable to open document"}</p>
          <button
            onClick={() => navigate("/home")}
            className={`mt-4 px-4 py-2 text-sm ${btn.primary}`}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    if (!doc?._id || downloading) return;

    try {
      setDownloading(true);
      const response = await axios.get(`/documents/${doc._id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
      const fileName = doc.originalName || `${doc.title}.${doc.fileType === "pdf" ? "pdf" : "bin"}`;

      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-text p-3 sm:p-5">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-text truncate">{doc.title}</p>
            <p className="text-xs text-muted mt-1">
              {doc.fileType.toUpperCase()} • {formatBytes(doc.bytes)} • {new Date(doc.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/home"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs ${btn.secondary}`}
            >
              <BackIcon />
              Back
            </Link>
            <button
              onClick={toggleFullscreen}
              className={`px-3 py-2 text-xs ${btn.secondary}`}
            >
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`px-3 py-2 text-xs ${btn.primary}`}
            >
              {downloading ? "Downloading..." : "Download"}
            </button>
          </div>
        </div>

        <div
          ref={previewRef}
          className={
            isFullscreen
              ? "relative bg-page h-screen w-screen p-2 sm:p-3"
              : "relative rounded-xl border border-border bg-surface p-2 sm:p-3 min-h-[70vh]"
          }
        >
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className={`absolute top-4 right-4 z-10 px-3 py-2 text-xs ${btn.secondary}`}
            >
              Exit Fullscreen
            </button>
          )}
          {doc.fileType === "pdf" ? (
            <PdfViewer
              url={doc.url}
              className={isFullscreen ? "w-full h-full bg-page" : "w-full h-[70vh] sm:h-[78vh] rounded-lg bg-page"}
            />
          ) : (
            <div
              className={
                isFullscreen
                  ? "w-full h-full bg-page flex items-center justify-center"
                  : "w-full h-[70vh] sm:h-[78vh] bg-page rounded-lg overflow-auto flex items-center justify-center"
              }
            >
              <img
                src={doc.url}
                alt={doc.title}
                className="max-w-full max-h-full object-contain"
                onError={() => setError("Image preview could not be loaded.")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
