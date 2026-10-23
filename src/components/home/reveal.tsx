"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Fades its `[data-reveal]` children up once, the first time they scroll into view.
 * Short and ease-out; skipped entirely for reduced motion.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const els = gsap.utils.toArray<HTMLElement>("[data-reveal]", root.current);
      gsap.set(els, { y: 16, opacity: 0 });
      ScrollTrigger.batch(els, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { y: 0, opacity: 1, duration: 0.38, ease: "power2.out", stagger: 0.05, clearProps: "transform,opacity" }),
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
