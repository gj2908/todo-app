import { useEffect, useRef, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import { getNotificationPermissionStatus, sendNotification } from "../utils/notifications";

interface Subject {
  _id: string;
  name: string;
  color?: string;
}

interface StudyTimerWidgetProps {
  subjects: Subject[];
}

type Phase = "focus" | "break";
type Status = "idle" | "running" | "paused";

const DEFAULT_FOCUS_MIN = 25;
const DEFAULT_BREAK_MIN = 5;

const formatElapsed = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const loadMinutes = (key: string, fallback: number) => {
  const stored = Number(localStorage.getItem(key));
  return stored > 0 ? stored : fallback;
};

// Two-oscillator beep via WebAudio - no audio asset needed.
const playBeep = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1108].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + i * 0.15;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  } catch {
    // best-effort - a missed beep shouldn't break the timer
  }
};

export default function StudyTimerWidget({ subjects }: StudyTimerWidgetProps) {
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [phase, setPhase] = useState<Phase>("focus");
  const [elapsed, setElapsed] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(() => loadMinutes("pomodoro:focusMinutes", DEFAULT_FOCUS_MIN));
  const [breakMinutes, setBreakMinutes] = useState(() => loadMinutes("pomodoro:breakMinutes", DEFAULT_BREAK_MIN));

  const phaseStartRef = useRef<number | null>(null);
  const pausedElapsedRef = useRef(0);
  const phaseRef = useRef<Phase>("focus");
  const subjectIdRef = useRef("");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    subjectIdRef.current = subjectId;
  }, [subjectId]);

  useEffect(() => {
    localStorage.setItem("pomodoro:focusMinutes", String(focusMinutes));
  }, [focusMinutes]);

  useEffect(() => {
    localStorage.setItem("pomodoro:breakMinutes", String(breakMinutes));
  }, [breakMinutes]);

  const phaseTotalSeconds = (p: Phase) => (p === "focus" ? focusMinutes : breakMinutes) * 60;

  const logFocusSession = async (durationMinutes: number, startedAt: Date) => {
    if (durationMinutes < 1) return;
    try {
      setSaving(true);
      await axios.post("/study-sessions", {
        subject: subjectIdRef.current || null,
        durationMinutes,
        startedAt,
      });
      toast.success(`Logged ${durationMinutes} min of focus time`);
    } catch {
      toast.error("Failed to log study session");
    } finally {
      setSaving(false);
    }
  };

  const announcePhase = (nextPhase: Phase) => {
    playBeep();
    const message = nextPhase === "focus" ? "Break's over - back to focus" : "Focus block done - take a break";
    toast.info(message);
    if (getNotificationPermissionStatus() === "granted") {
      sendNotification("Taskflow Pomodoro", { body: message, tag: "pomodoro-phase" });
    }
  };

  const advancePhase = (completedEarly: boolean) => {
    const finishedPhase = phaseRef.current;
    const startedAt = phaseStartRef.current ? new Date(phaseStartRef.current) : new Date();
    const actualSeconds = phaseStartRef.current ? Math.round((Date.now() - phaseStartRef.current) / 1000) : elapsed;

    if (finishedPhase === "focus") {
      const durationMinutes = completedEarly ? Math.round(actualSeconds / 60) : focusMinutes;
      logFocusSession(durationMinutes, startedAt);
      setCycleCount((c) => c + 1);
    }

    const nextPhase: Phase = finishedPhase === "focus" ? "break" : "focus";
    if (!completedEarly) announcePhase(nextPhase);
    setPhase(nextPhase);
    phaseRef.current = nextPhase;
    phaseStartRef.current = Date.now();
    setElapsed(0);
  };

  // Timestamp-based tick: elapsed is always derived from the wall-clock
  // delta since phase start, so a throttled/backgrounded tab self-corrects
  // instead of drifting from setInterval's own (unreliable) cadence.
  useEffect(() => {
    if (status !== "running") return;
    const tick = () => {
      if (!phaseStartRef.current) return;
      const secs = Math.round((Date.now() - phaseStartRef.current) / 1000);
      setElapsed(secs);
      if (secs >= phaseTotalSeconds(phaseRef.current)) {
        advancePhase(false);
      }
    };
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, focusMinutes, breakMinutes]);

  const handleStart = () => {
    if (status === "paused") {
      phaseStartRef.current = Date.now() - pausedElapsedRef.current * 1000;
    } else {
      setPhase("focus");
      phaseRef.current = "focus";
      setCycleCount(0);
      setElapsed(0);
      phaseStartRef.current = Date.now();
    }
    setStatus("running");
  };

  const handlePause = () => {
    pausedElapsedRef.current = elapsed;
    phaseStartRef.current = null;
    setStatus("paused");
  };

  const handleReset = () => {
    setStatus("idle");
    setPhase("focus");
    phaseRef.current = "focus";
    setElapsed(0);
    setCycleCount(0);
    phaseStartRef.current = null;
    pausedElapsedRef.current = 0;
  };

  const handleSkip = () => {
    if (status === "idle") return;
    advancePhase(true);
  };

  const handleStop = () => {
    if (status === "running" && phase === "focus" && phaseStartRef.current) {
      const startedAt = new Date(phaseStartRef.current);
      const durationMinutes = Math.round(elapsed / 60);
      logFocusSession(durationMinutes, startedAt);
    }
    handleReset();
  };

  const running = status === "running";
  const totalSeconds = phaseTotalSeconds(phase);
  const progressPct = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-text">Focus timer</h3>
          {status !== "idle" && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                phase === "focus" ? "bg-amber-500/15 text-amber-400" : "bg-green-500/15 text-green-400"
              }`}
            >
              {phase}
            </span>
          )}
        </div>
        <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">{formatElapsed(elapsed)}</span>
      </div>

      {status !== "idle" && (
        <div className="mb-3 h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${phase === "focus" ? "bg-amber-500" : "bg-green-500"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <select
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
        disabled={running}
        className="w-full mb-3 px-3 py-2 bg-surface-alt border border-border-strong rounded-lg text-text text-sm focus:outline-none focus:border-amber-500 transition disabled:opacity-50"
      >
        <option value="">No subject</option>
        {subjects.map((s) => (
          <option key={s._id} value={s._id}>{s.name}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <label className="text-xs text-muted">
          Focus (min)
          <input
            type="number"
            min={1}
            max={180}
            value={focusMinutes}
            disabled={status !== "idle"}
            onChange={(e) => setFocusMinutes(Math.max(1, Number(e.target.value) || DEFAULT_FOCUS_MIN))}
            className="mt-1 w-full px-2 py-1.5 bg-surface-alt border border-border-strong rounded-lg text-text text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
        </label>
        <label className="text-xs text-muted">
          Break (min)
          <input
            type="number"
            min={1}
            max={60}
            value={breakMinutes}
            disabled={status !== "idle"}
            onChange={(e) => setBreakMinutes(Math.max(1, Number(e.target.value) || DEFAULT_BREAK_MIN))}
            className="mt-1 w-full px-2 py-1.5 bg-surface-alt border border-border-strong rounded-lg text-text text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
        </label>
      </div>

      {status === "idle" ? (
        <button
          onClick={handleStart}
          className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition"
        >
          Start studying
        </button>
      ) : (
        <div className="flex gap-2">
          {running ? (
            <button
              onClick={handlePause}
              className="flex-1 py-2 rounded-lg bg-surface-alt hover:bg-border-strong text-text text-sm font-bold transition"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition"
            >
              Resume
            </button>
          )}
          <button
            onClick={handleSkip}
            className="px-3 py-2 rounded-lg bg-surface-alt hover:bg-border-strong text-text text-sm font-bold transition"
          >
            Skip
          </button>
          <button
            onClick={handleStop}
            disabled={saving}
            className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-bold transition disabled:opacity-50"
          >
            Stop
          </button>
        </div>
      )}

      {cycleCount > 0 && (
        <p className="mt-2 text-[11px] text-muted text-center">{cycleCount} focus {cycleCount === 1 ? "cycle" : "cycles"} completed</p>
      )}
    </div>
  );
}
