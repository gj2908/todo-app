import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export default function InstallPwaCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-200">Install app</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {installed
              ? "Taskflow is installed - notifications come from the app, not the browser."
              : "Install Taskflow for a full-screen app experience and app-attributed notifications."}
          </p>
        </div>
        {installed ? (
          <span className="text-[11px] font-bold px-2 py-1 rounded bg-green-500/15 text-green-400 whitespace-nowrap">
            Installed
          </span>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400 transition disabled:opacity-50 whitespace-nowrap"
          >
            {installing ? "Installing..." : "Install"}
          </button>
        ) : null}
      </div>

      {!installed && !deferredPrompt && (
        <p className="text-xs text-zinc-600 mt-3 pt-3 border-t border-zinc-800">
          {isIos()
            ? 'On iPhone/iPad: tap the Share icon in Safari, then "Add to Home Screen".'
            : "Your browser doesn't support one-click install here, or Taskflow was already dismissed - look for an install icon in the address bar."}
        </p>
      )}
    </div>
  );
}
