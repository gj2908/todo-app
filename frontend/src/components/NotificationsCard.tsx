import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
};

type PermissionState = "granted" | "denied" | "default" | "unsupported";

export default function NotificationsCard() {
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [notifyByPush, setNotifyByPush] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<PermissionState>(
    "Notification" in window ? (Notification.permission as PermissionState) : "unsupported"
  );

  useEffect(() => {
    setPushSupported("serviceWorker" in navigator && "PushManager" in window);
    axios.get("/auth/profile")
      .then((res) => {
        setNotifyByEmail(!!res.data.notifyByEmail);
        setNotifyByPush(!!res.data.notifyByPush);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    if (result === "granted") toast.success("Notifications turned on");
    else if (result === "denied") toast.error("Notifications blocked - allow them from your browser's site settings");
  };

  const savePreferences = async (next: { notifyByEmail?: boolean; notifyByPush?: boolean }) => {
    try {
      setSaving(true);
      await axios.put("/account/notification-preferences", next);
    } catch {
      toast.error("Failed to save notification preference");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEmail = async () => {
    const next = !notifyByEmail;
    setNotifyByEmail(next);
    await savePreferences({ notifyByEmail: next });
  };

  const subscribeToPush = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") {
        toast.error("Notification permission was not granted");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const { data } = await axios.get("/account/push-public-key");
      if (!data.publicKey) {
        toast.error("Push notifications aren't configured on the server");
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      const json = subscription.toJSON();
      await axios.post("/account/push-subscribe", { endpoint: json.endpoint, keys: json.keys });
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      toast.error("Failed to enable push notifications");
      return false;
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await axios.post("/account/push-unsubscribe", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    }
  };

  const handleTogglePush = async () => {
    if (!notifyByPush) {
      const ok = await subscribeToPush();
      if (!ok) return;
      setNotifyByPush(true);
      await savePreferences({ notifyByPush: true });
      toast.success("Push notifications enabled");
    } else {
      await unsubscribeFromPush();
      setNotifyByPush(false);
      await savePreferences({ notifyByPush: false });
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-zinc-200">Browser notifications</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Required for push and the per-task due-date reminder to show up</p>
        </div>
        {permission === "granted" ? (
          <span className="text-[11px] font-bold px-2 py-1 rounded bg-green-500/15 text-green-400 whitespace-nowrap">On</span>
        ) : permission === "denied" ? (
          <span className="text-[11px] font-bold px-2 py-1 rounded bg-red-500/15 text-red-400 whitespace-nowrap" title="Blocked in browser settings">Blocked</span>
        ) : permission === "unsupported" ? (
          <span className="text-[11px] font-bold px-2 py-1 rounded bg-zinc-700 text-zinc-400 whitespace-nowrap">Unsupported</span>
        ) : (
          <button
            onClick={handleRequestPermission}
            className="text-[11px] font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition whitespace-nowrap"
          >
            Off · Enable
          </button>
        )}
      </div>

      <h3 className="text-sm font-bold text-zinc-200">Daily digest</h3>
      <p className="text-xs text-zinc-500 mt-0.5">
        One summary each morning of what's due today and overdue - separate from the per-task reminder in the Reminders view.
      </p>

      <div className="mt-3 space-y-2">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 cursor-pointer">
          <span className="text-sm text-zinc-200">Email digest</span>
          <input
            type="checkbox"
            checked={notifyByEmail}
            onChange={handleToggleEmail}
            disabled={saving}
            className="w-4 h-4 accent-amber-500"
          />
        </label>
        <label className={`flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 ${pushSupported ? "cursor-pointer" : "opacity-50"}`}>
          <span className="text-sm text-zinc-200">Push notification digest</span>
          <input
            type="checkbox"
            checked={notifyByPush}
            onChange={handleTogglePush}
            disabled={saving || !pushSupported}
            className="w-4 h-4 accent-amber-500"
          />
        </label>
        {!pushSupported && (
          <p className="text-xs text-zinc-600">Push notifications aren't supported in this browser.</p>
        )}
      </div>
    </div>
  );
}
