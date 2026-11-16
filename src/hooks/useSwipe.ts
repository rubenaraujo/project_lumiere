import { useRef, type TouchEvent } from "react";

const MIN_DISTANCE = 80;
const MAX_VERTICAL = 60;

// Left-swipe detector. Ignores gestures that start inside `[data-no-swipe]`
// (horizontal scrollers) or on controls such as sliders.
export const useSwipeLeft = (onSwipe: () => void, enabled: boolean) => {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (event: TouchEvent) => {
    const target = event.target as HTMLElement;
    if (!enabled || event.touches.length !== 1 || target.closest("[data-no-swipe], [role='slider']")) {
      start.current = null;
      return;
    }
    start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!start.current) return;
    const dx = event.changedTouches[0].clientX - start.current.x;
    const dy = Math.abs(event.changedTouches[0].clientY - start.current.y);
    start.current = null;
    if (dx <= -MIN_DISTANCE && dy <= MAX_VERTICAL) onSwipe();
  };

  return { onTouchStart, onTouchEnd };
};
