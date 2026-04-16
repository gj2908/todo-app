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

  const [document, setDocument] = useState<VaultDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) {
        setError("Missing document ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get(`/documents/${documentId}`);
        setDocument(res.data);
      } catch {
        setError("Document not found or you do not have access.");
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

  if (error || !document) {
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-3 sm:p-5">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-zinc-100 truncate">{document.title}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {document.fileType.toUpperCase()} • {formatBytes(document.bytes)} • {new Date(document.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/home"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Back
            </Link>
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400"
            >
              Open Original
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 sm:p-3 min-h-[70vh]">
          {document.fileType === "pdf" ? (
            <iframe
              title={document.title}
              src={document.url}
              className="w-full h-[70vh] sm:h-[78vh] rounded-lg bg-zinc-950"
            />
          ) : (
            <div className="w-full h-[70vh] sm:h-[78vh] bg-zinc-950 rounded-lg overflow-auto flex items-center justify-center">
              <img
                src={document.url}
                alt={document.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
