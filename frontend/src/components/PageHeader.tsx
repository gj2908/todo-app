import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  /** Defaults to navigating to /home. Pass a custom handler to override. */
  onBack?: () => void;
  actions?: React.ReactNode;
}

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 3.5L5 8l5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// The single consistent header pattern for top-level pages reached off the
// main app shell (Profile, Settings, ...): a back control that always
// returns straight to /home in one tap, and a separate, non-interactive
// title - not an arrow-glyph-as-heading like the earlier per-page versions.
export default function PageHeader({ title, onBack, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onBack || (() => navigate("/home"))}
          aria-label="Back to workspace"
          className="p-1.5 -ml-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-200 active:scale-90 shrink-0"
        >
          <BackIcon />
        </button>
        <h1 className="text-lg font-bold text-zinc-100 truncate">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  );
}
