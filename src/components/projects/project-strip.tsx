"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getLenis } from "@/lib/lenis";
import { motion, stripLayout, stripStore, type StripItem } from "@/lib/strip-store";
import { CldImage } from "@/components/ui/cld-image";
import { CardMedia } from "./card-media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * DOM side of the /projects strip (docs/projects-strip.md): the stage the WebGL cards are
 * drawn into, input (swipe, drag, trackpad, keys, desktop scroll pin), the info block and the
 * open-to-case-study transition. StripGL (in the glass canvas) reads stripStore every frame.
 */

const SNAP = { duration: 0.6, ease: "power3.out" } as const;
const RUBBER = 0.35;

function webglSupported() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
const noSubscribe = () => () => {};

export function ProjectStrip({ items }: { items: StripItem[] }) {
  const reduced = useReducedMotion();
  // Checked directly (not via the glass canvas flag, which appears after load) so the page
  // doesn't flash the fallback row first. The server assumes WebGL.
  const webgl = useSyncExternalStore(noSubscribe, webglSupported, () => true);
  if (reduced || !webgl) return <StripFallback items={items} />;
  return <InteractiveStrip items={items} />;
}

function InteractiveStrip({ items }: { items: StripItem[] }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const crisp = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ id: number; x0: number; p0: number; moved: boolean; samples: { t: number; p: number }[] } | null>(null);
  const { activeIndex, openIndex } = useSyncExternalStore(stripStore.subscribe, stripStore.get, stripStore.get);
  const [desktop, setDesktop] = useState(false);
  const [shown, setShown] = useState(0);
  const count = items.length;
  const last = Math.max(0, count - 1);
  // Desktop with 4+ projects: page scroll drives the strip (spec §4). Otherwise swipe/drag/buttons.
  const pinned = desktop && count >= 4;

  // ---------- store wiring ----------
  useEffect(() => {
    stripStore.setItems(items);
  }, [items]);

  useEffect(() => {
    stripStore.setStage(stage.current);
    // entrance: start off to the right; the tween below brings the cards in
    motion.progress = -1.4;
    return () => {
      stripStore.setStage(null);
      stripStore.setItems([]);
      stripStore.setOpen(null);
      gsap.killTweensOf(motion);
      Object.assign(motion, { progress: 0, velocity: 0, open: 0 });
      stripStore.setActive(0);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const pitch = useCallback(() => {
    const w = stage.current?.getBoundingClientRect().width ?? window.innerWidth;
    return stripLayout(w, window.innerWidth).pitch;
  }, []);

  const rubber = useCallback((p: number) => (p < 0 ? p * RUBBER : p > last ? last + (p - last) * RUBBER : p), [last]);

  // ---------- moving the strip ----------
  /** page scroll position that shows card position p (pinned mode only) */
  const scrollFor = useCallback(
    (p: number) => {
      const st = trigger.current!;
      return st.start + (last ? p / last : 0) * (st.end - st.start);
    },
    [last],
  );

  const go = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(last, Math.round(index)));
      stripStore.setActive(target);
      if (pinned && trigger.current) {
        const y = scrollFor(target);
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { duration: SNAP.duration, easing: (t) => 1 - Math.pow(1 - t, 3) });
        else window.scrollTo({ top: y });
        return;
      }
      gsap.to(motion, { progress: target, ...SNAP, overwrite: true });
    },
    [last, pinned, scrollFor],
  );

  // entrance, the first time the stage scrolls into view: cards slide in and flex once
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        gsap.to(motion, { progress: stripStore.get().activeIndex, duration: 0.9, ease: "power3.out", overwrite: true });
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // desktop pin: scroll distance = (n − 1) × 70vh, scrubbed to progress; snap when scrolling stops
  useGSAP(
    () => {
      if (!pinned || !root.current) return;
      const st = ScrollTrigger.create({
        trigger: root.current,
        pin: true,
        start: "top top+=88",
        end: () => `+=${last * 0.7 * window.innerHeight}`,
        onUpdate: (self) => {
          if (drag.current?.moved) return;
          motion.progress = self.progress * last;
          stripStore.setActive(Math.round(motion.progress));
          if (settle.current) clearTimeout(settle.current);
          settle.current = setTimeout(() => {
            if (self.isActive && !drag.current) go(Math.round(motion.progress));
          }, 150);
        },
      });
      trigger.current = st;
      return () => {
        trigger.current = null;
        if (settle.current) clearTimeout(settle.current);
      };
    },
    { dependencies: [pinned, last], scope: root },
  );

  // ---------- open: unbend, zoom, then the case study ----------
  const open = useCallback(() => {
    if (stripStore.get().openIndex !== null) return;
    const index = stripStore.get().activeIndex;
    const item = items[index];
    if (!item) return;
    stripStore.setOpen(index);
    gsap.killTweensOf(motion);
    gsap.to(motion, { progress: index, duration: 0.3, ease: "power2.out" });
    if (info.current) gsap.to(info.current, { opacity: 0, y: 8, duration: 0.25, ease: "power2.in" });
    gsap.to(motion, {
      open: 1,
      duration: 0.55,
      ease: "power3.inOut",
      onComplete: () => router.push(`/projects/${item.slug}`),
    });
  }, [items, router]);

  // ---------- input: swipe / mouse drag, with momentum and rubber-band ends ----------
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || openIndex !== null) return;
    gsap.killTweensOf(motion, "progress");
    drag.current = { id: e.pointerId, x0: e.clientX, p0: motion.progress, moved: false, samples: [{ t: performance.now(), p: motion.progress }] };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || count < 2) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const raw = d.p0 - dx / pitch();
    if (pinned && trigger.current) {
      const p = Math.max(0, Math.min(last, raw));
      motion.progress = p;
      getLenis()?.scrollTo(scrollFor(p), { immediate: true, force: true });
    } else {
      motion.progress = rubber(raw);
    }
    stripStore.setActive(Math.max(0, Math.min(last, Math.round(motion.progress))));
    const now = performance.now();
    d.samples.push({ t: now, p: motion.progress });
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift();
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return tap(e.clientX);
    // release: carry the flick's velocity a little further, then snap to a card
    const first = d.samples[0];
    const end = d.samples[d.samples.length - 1];
    const dt = (end.t - first.t) / 1000;
    const v = dt > 0 ? (end.p - first.p) / dt : 0; // cards per second
    go(motion.progress + v * 0.25);
  }

  function onPointerCancel() {
    // the browser took over (vertical page scroll): settle on the nearest card
    if (drag.current?.moved) go(motion.progress);
    drag.current = null;
  }

  function tap(clientX: number) {
    const rect = stage.current!.getBoundingClientRect();
    const index = Math.round(motion.progress + (clientX - (rect.left + rect.width / 2)) / pitch());
    if (index < 0 || index > last) return;
    if (index === activeIndex) open();
    else go(index);
  }

  // trackpad sideways swipe (wheel deltaX); vertical wheel stays page scroll
  useEffect(() => {
    const el = stage.current;
    if (!el || count < 2) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || stripStore.get().openIndex !== null) return;
      e.preventDefault();
      const p = pitch();
      if (pinned && trigger.current) {
        const next = Math.max(0, Math.min(last, motion.progress + e.deltaX / p));
        getLenis()?.scrollTo(scrollFor(next), { immediate: true, force: true });
        return;
      }
      gsap.killTweensOf(motion, "progress");
      motion.progress = Math.max(-0.15, Math.min(last + 0.15, motion.progress + e.deltaX / p));
      stripStore.setActive(Math.max(0, Math.min(last, Math.round(motion.progress))));
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(() => go(motion.progress), 140);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [count, go, last, pinned, pitch, scrollFor]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => go(activeIndex - 1),
      ArrowRight: () => go(activeIndex + 1),
      Home: () => go(0),
      End: () => go(last),
      Enter: open,
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  }

  // ---------- crisp image: a real <img> over the centred card whenever the strip is at rest ----------
  // The WebGL canvas never renders at a phone's full density (capped, and lowered under load), so
  // screenshots drawn there look soft. At rest the centred card is exactly flat (uFlat in the shader),
  // and this DOM image, at full device resolution, sits on it pixel for pixel. Any motion hides it.
  useEffect(() => {
    let atRest = false;
    const update = () => {
      const el = crisp.current;
      if (!el) return;
      const { activeIndex: active, openIndex: opened } = stripStore.get();
      const rest =
        opened === null && motion.open === 0 && Math.abs(motion.velocity) < 0.01 && Math.abs(motion.progress - active) < 0.002;
      if (rest === atRest) return;
      atRest = rest;
      el.dataset.rest = String(rest);
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  // ---------- info: progress line follows the strip; text swaps only when the index changes ----------
  useEffect(() => {
    const update = () => {
      if (!fill.current) return;
      const t = last ? Math.max(0, Math.min(1, motion.progress / last)) : 1;
      fill.current.style.transform = `scaleX(${t})`;
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [last]);

  useEffect(() => {
    if (!info.current) return;
    const swap = info.current.querySelectorAll("[data-swap]");
    if (activeIndex === shown) {
      // came back to the shown project before the old text finished leaving: restore it
      gsap.to(swap, { y: 0, opacity: 1, duration: 0.12, ease: "power1.out", overwrite: true });
      return;
    }
    router.prefetch(`/projects/${items[activeIndex]?.slug}`);
    const tween = gsap.to(swap, {
      y: -8,
      opacity: 0,
      duration: 0.12,
      ease: "power1.in",
      onComplete: () => setShown(activeIndex),
    });
    return () => {
      tween.kill();
    };
  }, [activeIndex, items, router, shown]);

  useGSAP(
    () => {
      if (!info.current) return;
      gsap.set(info.current!.querySelectorAll("[data-swap]"), { y: 0, opacity: 1 });
      // the title's words animate in with CSS (.strip-word), see globals.css
      gsap.from(info.current!.querySelectorAll("[data-fade]"), { opacity: 0, duration: 0.26, ease: "power2.out" });
    },
    { dependencies: [shown], scope: info },
  );

  const current = items[shown] ?? items[0];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div ref={root} className="mt-10">
      {/* Width-based height: card height (16:10 of the card width) × 1.35, per spec §2 */}
      <div className="@container">
        <div
          ref={stage}
          data-strip
          role="region"
          aria-roledescription="carousel"
          aria-label="Selected projects"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className={`relative h-[calc(82cqw*0.84375)] w-full touch-pan-y rounded-[22px] outline-none select-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-paper md:h-[calc(min(56cqw,860px)*0.84375)] ${
            count > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
          }`}
        >
          {/* same size, position and corners as the centred WebGL card (stripLayout); see the crisp-image effect */}
          <div
            ref={crisp}
            data-rest="false"
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 aspect-[16/10] w-[82cqw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] opacity-0 transition-opacity duration-75 data-[rest=true]:opacity-100 data-[rest=true]:duration-200 md:w-[min(56cqw,860px)] md:rounded-[18px]"
          >
            {items.map((item, i) =>
              // the active card and its neighbours, so the next one is already loaded
              Math.abs(i - activeIndex) <= 1 ? (
                <div key={item.slug} className={`absolute inset-0 ${i === activeIndex ? "opacity-100" : "opacity-0"}`}>
                  <CrispCard item={item} priority={i === activeIndex} />
                </div>
              ) : null,
            )}
            {/* the WebGL card's thin bright rim */}
            <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.35)]" />
          </div>
        </div>
      </div>
      {/* announces the settled project, not every card passed mid-drag */}
      <p aria-live="polite" className="sr-only">
        Project {shown + 1} of {count}: {current?.title}
      </p>

      {count > 1 && (
        <div className="mt-6 flex items-center gap-4">
          <span className="font-mono text-[11px] tracking-[0.12em] text-ink-3 tabular-nums">
            {pad(activeIndex + 1)} / {pad(count)}
          </span>
          <div aria-hidden className="h-px flex-1 overflow-hidden bg-line">
            <div ref={fill} className="h-full w-full origin-left bg-ink/60" style={{ transform: "scaleX(0)" }} />
          </div>
          <StripButton label="Previous project" disabled={activeIndex === 0} onClick={() => go(activeIndex - 1)}>
            <path d="M15 6l-6 6 6 6" />
          </StripButton>
          <StripButton label="Next project" disabled={activeIndex === last} onClick={() => go(activeIndex + 1)}>
            <path d="M9 6l6 6-6 6" />
          </StripButton>
        </div>
      )}

      {current && (
        <div ref={info} className="mt-8">
          <h2
            key={shown}
            data-title
            data-swap
            className="text-[clamp(1.9rem,6.4vw,3rem)] leading-[1.04] font-semibold tracking-[-0.032em] text-balance"
          >
            {/*
              Words are spans from the start and animate in with CSS keyframes (staggered by
              --i). SplitText rewrote this DOM on every swap and, with GSAP driving each word,
              dropped a 4x-throttled phone from ~30 to 8 fps while the strip moved.
            */}
            {current.title.split(/\s+/).map((word, i) => (
              <span key={i} className="strip-word" style={{ "--i": i } as React.CSSProperties}>
                {word}{" "}
              </span>
            ))}
          </h2>
          <div data-swap data-fade>
            {current.outcome && <p className="mt-3 line-clamp-3 max-w-[56ch] text-[17px] font-medium sm:text-[19px]">{current.outcome}</p>}
            <p className="mt-2 line-clamp-3 max-w-[56ch] text-[16px] leading-relaxed text-ink-2">{current.summary}</p>
            {current.tags.length > 0 && (
              // stack values can be one long dotted word; let them break instead of widening the page
              <p className="mt-4 font-mono text-[11px] tracking-[0.08em] break-words text-ink-3 uppercase [overflow-wrap:anywhere]">
                {current.tags.join(" · ")}
              </p>
            )}
            <Link
              href={`/projects/${current.slug}`}
              data-glass="panel"
              className="glass mt-6 inline-flex h-12 items-center gap-2 rounded-full! px-6 text-[15px] font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              View case study <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Full-resolution DOM version of a strip card: the same 16:10 top-anchored crop as the WebGL
 * texture, or for app-only projects the same three-phone layout as phoneComposite().
 */
function CrispCard({ item, priority }: { item: StripItem; priority: boolean }) {
  const sizes = "(min-width: 768px) min(56vw, 860px), 82vw";
  if (item.image) {
    return (
      <CldImage
        src={item.image.publicId}
        width={1600}
        height={1000}
        crop="fill"
        gravity="north"
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "eager"}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }
  const phones = item.phones.slice(0, 3);
  const span = phones.length * 0.28 + (phones.length - 1) * 0.04;
  return (
    <div className="relative h-full w-full bg-[#efebe3]">
      {phones.map((p, i) => (
        <CldImage
          key={p.publicId}
          src={p.publicId}
          width={p.width}
          height={p.height}
          sizes="25vw"
          loading="eager"
          alt=""
          className="absolute w-[28%] rounded-t-[6px] shadow-[0_10px_24px_-14px_oklch(0.2_0.02_60/0.5)]"
          style={{ left: `${((1 - span) / 2 + i * 0.32) * 100}%`, top: i === 1 ? "6%" : "12%" }}
        />
      ))}
    </div>
  );
}

/** Reduced motion or no WebGL (spec §8): a plain scroll-snap row of the grid's glass cards. */
function StripFallback({ items }: { items: StripItem[] }) {
  return (
    <ul
      aria-label="Selected projects"
      className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none]"
    >
      {items.map((p) => (
        <li key={p.slug} className="w-[82%] shrink-0 snap-center md:w-[56%]">
          <Link href={`/projects/${p.slug}`} className="glass block h-full overflow-hidden p-2">
            <CardMedia project={p.media} wide={false} />
            <div className="p-4">
              <h2 className="text-[18px] font-semibold tracking-[-0.01em]">{p.title}</h2>
              <p className="mt-1 text-[15px] text-ink-2">{p.summary}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
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
      className="glass grid size-12 shrink-0 place-items-center rounded-full! transition-[transform,opacity] duration-150 ease-out active:scale-[0.94] disabled:opacity-40"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
