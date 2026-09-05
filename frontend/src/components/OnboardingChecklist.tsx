import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../axiosConfig";
import { isStandalone } from "./InstallPwaCard";

const DISMISSED_KEY = "onboarding:dismissed";

interface OnboardingChecklistProps {
  hasSubject: boolean;
  hasTask: boolean;
  onAddTask: () => void;
}

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function OnboardingChecklist({ hasSubject, hasTask, onAddTask }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [emailVerified, setEmailVerified] = useState(true);
  const installed = isStandalone();

  useEffect(() => {
    axios.get("/auth/profile")
      .then((res) => setEmailVerified(!!res.data.emailVerified))
      .catch(() => {});
  }, []);

  const items = [
    { done: hasSubject, label: "Create your first subject", cta: null as React.ReactNode },
    { done: hasTask, label: "Add your first task", cta: !hasTask && (
      <button onClick={onAddTask} className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition">Add task</button>
    ) },
    { done: emailVerified, label: "Verify your email", cta: !emailVerified && (
      <Link to="/profile" className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition">Go to profile</Link>
    ) },
    { done: installed, label: "Install the app", cta: !installed && (
      <Link to="/settings" className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition">Go to settings</Link>
    ) },
  ];

  const allDone = items.every((i) => i.done);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, "true"); } catch { /* ignore storage failures */ }
  };

  if (dismissed || allDone) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-100">Getting started</h3>
        <button onClick={dismiss} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition">Dismiss</button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-amber-500 text-black" : "border border-zinc-700 text-transparent"}`}>
                <CheckIcon />
              </span>
              <span className={`text-sm ${item.done ? "text-zinc-500 line-through" : "text-zinc-300"}`}>{item.label}</span>
            </div>
            {item.cta}
          </div>
        ))}
      </div>
    </div>
  );
}
