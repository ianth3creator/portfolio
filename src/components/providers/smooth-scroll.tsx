"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis drives scrolling; GSAP's ticker drives Lenis, so ScrollTrigger and Lenis
 * share one clock. Do NOT add GSAP ScrollSmoother on top of this.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // anchors: in-page links glide instead of jumping
    const lenis = new Lenis({ autoRaf: false, lerp: 0.1, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    lenisRef.current = lenis;

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // New page: start at the top immediately, so Lenis doesn't glide from the old position.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    ScrollTrigger.refresh();
  }, [pathname]);

  return <>{children}</>;
}
