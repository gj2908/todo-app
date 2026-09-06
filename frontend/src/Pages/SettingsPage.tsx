import { useState } from "react";
import axios from "../axiosConfig";
import Navbar from "../components/Navbar";
import SessionsCard from "../components/SessionsCard";
import TwoFactorCard from "../components/TwoFactorCard";
import NotificationsCard from "../components/NotificationsCard";
import InstallPwaCard from "../components/InstallPwaCard";
import PageHeader from "../components/PageHeader";
import { btn } from "../lib/ui";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase px-1 pt-1">{children}</p>
);

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await axios.get("/account/export", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "taskflow-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // no-op, handled below via toast in shared axios config
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-4 sm:pt-5 pb-6">
        <div className="w-full max-w-lg space-y-4">
          <PageHeader title="Settings" />

          <div className="space-y-2">
            <SectionLabel>Security</SectionLabel>
            <TwoFactorCard />
            <SessionsCard />
          </div>

          <div className="space-y-2">
            <SectionLabel>Notifications</SectionLabel>
            <NotificationsCard />
            <InstallPwaCard />
          </div>

          <div className="space-y-2">
            <SectionLabel>Data</SectionLabel>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Export your data</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Download every task, subject, note, and document record as one JSON file</p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className={`px-3 py-2 text-xs whitespace-nowrap ${btn.secondary}`}
                >
                  {exporting ? "Preparing..." : "Export data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
