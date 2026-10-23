"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Placeholder background: a few soft colour fields drifting slowly, so the glass
 * has something to refract. To be replaced by the WebGL fluid layer (see CLAUDE.md).
 */
export function Ambient() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.utils.toArray<HTMLElement>("[data-blob]").forEach((el, i) => {
        gsap.to(el, {
          xPercent: gsap.utils.random(-25, 25),
          yPercent: gsap.utils.random(-20, 20),
          duration: gsap.utils.random(9, 14),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.4,
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div data-blob className="absolute top-[8%] left-[-10%] size-[55vmax] rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.86 0.09 230), transparent 65%)" }} />
      <div data-blob className="absolute top-[30%] right-[-15%] size-[50vmax] rounded-full opacity-45 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.88 0.08 330), transparent 65%)" }} />
      <div data-blob className="absolute bottom-[-20%] left-[20%] size-[50vmax] rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.9 0.09 150), transparent 65%)" }} />
    </div>
  );
}
