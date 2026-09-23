// The reviews carousel's rotation rules, kept pure so they can be tested
// without a DOM. src/components/review-carousel.tsx is the only caller.

export const ROTATE_INTERVAL_MS = 6000;

export type RotationState = {
  count: number;
  /** prefers-reduced-motion: reduce — no auto-rotation at all, ever. */
  reducedMotion: boolean;
  hovered: boolean;
  /** Keyboard focus anywhere inside the carousel. */
  focused: boolean;
  /** The visitor pressed Pause. */
  paused: boolean;
};

export function shouldAutoRotate(s: RotationState): boolean {
  return s.count > 1 && !s.reducedMotion && !s.hovered && !s.focused && !s.paused;
}

/** Index `delta` steps from `index`, wrapping in both directions. */
export function stepIndex(index: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + delta) % count) + count) % count;
}

/**
 * aria-live for the slide region. Polite while the visitor is in control;
 * off while it rotates on its own, or a screen reader would be interrupted
 * with a new review every six seconds (WAI-ARIA carousel pattern). Hover and
 * focus stop the rotation, so a visitor using the controls always hears the
 * review they moved to.
 */
export function liveMode(rotating: boolean): "off" | "polite" {
  return rotating ? "off" : "polite";
}
