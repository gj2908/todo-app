// Shared class-name fragments for the app's button/card/input conventions.
// Compose with size/layout classes at the call site, e.g.
// `${btn.primary} px-4 py-2 text-sm`.
export const btn = {
  primary:
    "bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
  secondary:
    "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg border border-zinc-700 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
  danger:
    "bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
  ghost:
    "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-all duration-200 active:scale-[0.97]",
  dangerGhost:
    "bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg transition-all duration-200 active:scale-[0.97]",
  // Large, isolated calls-to-action (auth submit, empty-state prompts) get
  // more visual weight than an inline/row button: bigger radius + a glow.
  cta: "bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
} as const;

// rounded-xl + zinc-900/zinc-800 is the dominant "panel/section" surface
// used throughout the app; rounded-2xl is reserved for page-level cards
// and modals (auth screens, Profile/Settings, TodoModal, ManageSubjectModal).
export const card = {
  panel: "rounded-xl border border-zinc-800 bg-zinc-900",
  page: "rounded-2xl border border-zinc-800 bg-zinc-900",
} as const;

export const input =
  "bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition";
