interface OfflineBannerProps {
  isOffline: boolean;
  pendingSyncCount: number;
  offlineLabel?: string;
}

export default function OfflineBanner({ isOffline, pendingSyncCount, offlineLabel = "showing cached data" }: OfflineBannerProps) {
  if (!isOffline && pendingSyncCount === 0) return null;

  return (
    <div className="px-4 sm:px-6 pt-3">
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        {isOffline
          ? `You're offline - ${offlineLabel}.`
          : `Back online - syncing ${pendingSyncCount} pending change${pendingSyncCount > 1 ? "s" : ""}...`}
        {isOffline && pendingSyncCount > 0 && ` ${pendingSyncCount} change${pendingSyncCount > 1 ? "s" : ""} pending sync.`}
      </div>
    </div>
  );
}
