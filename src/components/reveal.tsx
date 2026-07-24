"use client";

import { useEffect, useRef, useState } from "react";

// Fades + slides an element in the first time it scrolls into view. `rule`
// variant scales a divider in from the left instead. Fires once; mirrors the
// "reveal on scroll" language used throughout the v2 landing page design.
export function Reveal({
  children,
  delay = 0,
  variant = "fade",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  variant?: "fade" | "rule";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hiddenTransform = variant === "rule" ? "scale-x-0" : "translate-y-5 opacity-0";
  const shownTransform = variant === "rule" ? "scale-x-100" : "translate-y-0 opacity-100";
  const origin = variant === "rule" ? "origin-left" : "";

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${origin} ${visible ? shownTransform : hiddenTransform} ${className}`}
    >
      {children}
    </div>
  );
}
