import { useEffect, useRef } from "react";

interface UseEdgeSwipeOptions {
  /** Whether the panel the gesture controls is currently open. */
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** How close to the left edge (px) a touch must start to begin an "open" swipe. */
  edgeWidth?: number;
  /** Rightward drag distance (px) needed to trigger onOpen. */
  openThreshold?: number;
  /** Leftward drag distance (px) needed to trigger onClose once open. */
  closeThreshold?: number;
  /** Desktop breakpoint (px) above which the gesture is a no-op - the panel it
   *  controls is typically a mobile-only drawer with a persistent desktop rail. */
  maxWidth?: number;
}

// A native-app-style edge-swipe: starting a touch within `edgeWidth` of the
// left screen edge and dragging right opens the panel; once open, dragging
// left anywhere closes it. Mirrors the gesture iOS/Android users already
// expect from a slide-in navigation drawer.
export function useEdgeSwipe({
  isOpen,
  onOpen,
  onClose,
  edgeWidth = 24,
  openThreshold = 60,
  closeThreshold = 60,
  maxWidth = 1024,
}: UseEdgeSwipeOptions) {
  const stateRef = useRef<{ startX: number; startY: number; tracking: "open" | "close" } | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= maxWidth) return;
      const touch = e.touches[0];
      if (!touch) return;

      if (isOpenRef.current) {
        stateRef.current = { startX: touch.clientX, startY: touch.clientY, tracking: "close" };
      } else if (touch.clientX <= edgeWidth) {
        stateRef.current = { startX: touch.clientX, startY: touch.clientY, tracking: "open" };
      } else {
        stateRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;
      if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll - not our gesture

      if (state.tracking === "open" && dx > openThreshold) {
        onOpen();
        stateRef.current = null;
      } else if (state.tracking === "close" && dx < -closeThreshold) {
        onClose();
        stateRef.current = null;
      }
    };

    const clearState = () => {
      stateRef.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", clearState, { passive: true });
    document.addEventListener("touchcancel", clearState, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", clearState);
      document.removeEventListener("touchcancel", clearState);
    };
  }, [onOpen, onClose, edgeWidth, openThreshold, closeThreshold, maxWidth]);
}
