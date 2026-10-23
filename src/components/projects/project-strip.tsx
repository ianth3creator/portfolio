"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { motion, stripStore, type StripItem } from "@/lib/strip-store";

/**
 * DOM side of the /projects strip (docs/projects-strip.md §5): the stage the WebGL cards
 * are drawn into, and the controls. StripGL (in the glass canvas) reads stripStore.
 */
export function ProjectStrip({ items }: { items: StripItem[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { activeIndex } = useSyncExternalStore(stripStore.subscribe, stripStore.get, stripStore.get);
  const count = items.length;

  useEffect(() => {
    stripStore.setItems(items);
  }, [items]);

  useEffect(() => {
    stripStore.setStage(stage.current);
    return () => {
      stripStore.setStage(null);
      stripStore.setItems([]);
      gsap.killTweensOf(motion);
      motion.progress = 0;
      motion.velocity = 0;
      stripStore.setActive(0);
    };
  }, []);

  function go(index: number) {
    const target = Math.max(0, Math.min(count - 1, index));
    stripStore.setActive(target);
    if (reduced) {
      gsap.killTweensOf(motion);
      motion.progress = target;
      return;
    }
    gsap.to(motion, { progress: target, duration: 0.6, ease: "power3.out", overwrite: true });
  }

  return (
    <div className="mt-10">
      {/* Width-based height: card height (16:10 of the card width) × 1.35, per spec §2 */}
      <div className="@container">
        <div
          ref={stage}
          data-strip
          className="h-[calc(82cqw*0.84375)] w-full md:h-[calc(min(56cqw,860px)*0.84375)]"
        />
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-end gap-3">
          <StripButton label="Previous project" disabled={activeIndex === 0} onClick={() => go(activeIndex - 1)}>
            <path d="M15 6l-6 6 6 6" />
          </StripButton>
          <StripButton label="Next project" disabled={activeIndex === count - 1} onClick={() => go(activeIndex + 1)}>
            <path d="M9 6l6 6-6 6" />
          </StripButton>
        </div>
      )}
    </div>
  );
}

function StripButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      data-glass="panel"
      className="glass grid size-12 place-items-center rounded-full! transition-[transform,opacity] duration-150 ease-out active:scale-[0.94] disabled:opacity-40"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
