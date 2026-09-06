import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import { btn } from "../lib/ui";
import PdfViewer from "./PdfViewer";

interface DatesheetDocument {
  _id: string;
  title: string;
  fileType: "image" | "pdf";
  url: string;
  createdAt: string;
}

export default function DatesheetPanel() {
  const [datesheet, setDatesheet] = useState<DatesheetDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDatesheet = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/documents", { params: { kind: "datesheet" } });
      setDatesheet(res.data[0] || null);
    } catch {
      toast.error("Failed to load datesheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatesheet();
  }, []);

  const handleUpload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", "datesheet");

    try {
      setUploading(true);
      const res = await axios.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDatesheet(res.data);
      toast.success("Datesheet uploaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Your current exam schedule. Uploading a new one replaces it.</p>
        <label className={`shrink-0 flex items-center justify-center gap-2 px-3 py-2 text-sm cursor-pointer ${btn.primary}`}>
          {uploading ? "Uploading..." : datesheet ? "Replace" : "Upload"}
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3">
        {loading ? (
          <p className="text-sm text-muted p-4">Loading datesheet...</p>
        ) : !datesheet ? (
          <p className="text-sm text-muted p-4">No datesheet uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-text truncate">{datesheet.title}</p>
              <a
                href={`/document-vault/${datesheet._id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-surface-alt px-2.5 py-1.5 text-xs text-text hover:bg-border-strong shrink-0"
              >
                Fullscreen
              </a>
            </div>
            {datesheet.fileType === "pdf" ? (
              <PdfViewer url={datesheet.url} className="w-full h-[70vh] rounded-lg bg-page" />
            ) : (
              <div className="w-full h-[70vh] bg-page rounded-lg overflow-auto flex items-center justify-center">
                <img src={datesheet.url} alt={datesheet.title} className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
