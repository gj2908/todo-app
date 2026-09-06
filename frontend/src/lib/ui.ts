// Shared class-name fragments for the app's button/card/input conventions.
// Compose with size/layout classes at the call site, e.g.
// `${btn.primary} px-4 py-2 text-sm`.
// bg-accent/border-* etc. resolve via CSS custom properties (index.css) so
// these tokens are theme-aware without a `dark:` variant on every call site -
// see tailwind.config.js's semantic color extensions.
export const btn = {
  primary:
    "bg-accent hover:bg-amber-400 text-black font-bold rounded-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
  secondary:
    "bg-surface-alt hover:bg-border-strong text-text font-semibold rounded-lg border border-border-strong transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
  danger:
    "bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
  ghost:
    "text-muted hover:text-text hover:bg-surface-alt rounded-lg transition-all duration-200 active:scale-[0.97]",
  dangerGhost:
    "bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg transition-all duration-200 active:scale-[0.97]",
  // Large, isolated calls-to-action (auth submit, empty-state prompts) get
  // more visual weight than an inline/row button: bigger radius + a glow.
  cta: "bg-accent hover:bg-amber-400 text-black font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
} as const;

// rounded-xl + surface/border is the dominant "panel/section" surface used
// throughout the app; rounded-2xl is reserved for page-level cards and
// modals (auth screens, Profile/Settings, TodoModal, ManageSubjectModal).
export const card = {
  panel: "rounded-xl border border-border bg-surface",
  page: "rounded-2xl border border-border bg-surface",
} as const;

export const input =
  "bg-surface-alt border border-border-strong rounded-lg text-text placeholder-muted focus:outline-none focus:border-accent transition";
