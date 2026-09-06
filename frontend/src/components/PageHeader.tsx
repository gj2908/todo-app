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
// main app shell (Profile, Settings, ...): a back control styled to match
// Navbar's hamburger button exactly (same size/padding/hover/press feel,
// so the header reads as a continuation of the app chrome rather than a
// separate "modal page" look), and a title sized like every other page's
// heading in the app - not the small arrow-glyph-as-heading of earlier
// per-page versions.
export default function PageHeader({ title, onBack, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack || (() => navigate("/home"))}
          aria-label="Back to workspace"
          className="p-2 -ml-2 rounded-lg text-muted hover:text-text hover:bg-surface-alt transition-all duration-200 active:scale-90 shrink-0"
        >
          <BackIcon />
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight truncate">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  );
}
