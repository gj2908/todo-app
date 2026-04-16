import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../axiosConfig";

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
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading document...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center">
          <p className="text-sm text-red-400">{error || "Unable to open document"}</p>
          <button
            onClick={() => navigate("/home")}
            className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400"
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
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-3 sm:p-5">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-zinc-100 truncate">{doc.title}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {doc.fileType.toUpperCase()} • {formatBytes(doc.bytes)} • {new Date(doc.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/home"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Back
            </Link>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-60"
            >
              {downloading ? "Downloading..." : "Download"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 sm:p-3 min-h-[70vh]">
          {doc.fileType === "pdf" ? (
            <object data={doc.url} type="application/pdf" className="w-full h-[70vh] sm:h-[78vh] rounded-lg bg-zinc-950">
              <div className="h-full flex items-center justify-center text-center p-4">
                <div>
                  <p className="text-sm text-zinc-400">Preview is unavailable in this browser.</p>
                  <button
                    onClick={handleDownload}
                    className="mt-3 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400"
                  >
                    Download file
                  </button>
                </div>
              </div>
            </object>
          ) : (
            <div className="w-full h-[70vh] sm:h-[78vh] bg-zinc-950 rounded-lg overflow-auto flex items-center justify-center">
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
