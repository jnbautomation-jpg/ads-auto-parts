"use client";

import { useEffect, useRef, useState } from "react";

// Animated counter that is correct before it animates.
//
// Phase 2 spec 1.11: this previously started at useState(0), so the server
// rendered "0" and it stayed "0" until the element scrolled into view. Anyone
// who didn't scroll that far — and every crawler, and every visitor with JS
// disabled — saw the homepage advertise "0 HR / 0 PM / 0%".
//
// The real value is now the initial state, so it is what gets server-rendered.
// The count-up is applied only as a progressive enhancement, and only when it
// can run without ever showing a wrong number.
export function CountUp({ target, className = "" }: { target: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Server-rendered and pre-hydration value: the truth.
  const [value, setValue] = useState(target);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect the user's motion preference by simply leaving the real value
    // in place — nothing to animate, nothing to reset.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // If the counter is already on screen at load, animating would mean
    // dropping a visible, correct number to 0 first. Not worth a flash of
    // wrong data for a decorative effect — leave it.
    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (alreadyVisible) return;

    // Off screen: safe to reset to 0 and count up when the user reaches it.
    setValue(0);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);

          const start = performance.now();
          const duration = 1100;
          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
