/**
 * Shared state between the /projects strip's DOM side (ProjectStrip: input, buttons, info)
 * and its WebGL side (StripGL, inside the glass canvas). See docs/projects-strip.md §5.
 *
 * - `motion` is mutated every frame (by input or GSAP tweens) and read in useFrame. Never put it in React state.
 * - Everything else changes rarely and notifies subscribers (useSyncExternalStore).
 */

import type { Project } from "@/lib/types";

export type StripImage = { publicId: string; width: number; height: number };

export type StripItem = {
  slug: string;
  title: string;
  summary: string;
  outcome: string;
  /** platforms then stack, for the mono tag line */
  tags: string[];
  /** the wide image (cover, else first web screenshot) */
  image?: StripImage;
  /** app-only projects: up to 3 phone screenshots, composited into one card texture */
  phones: StripImage[];
  /** the same media as the grid cards, for the reduced-motion / no-WebGL row */
  media: Pick<Project, "cover" | "webShots" | "appShots">;
};

type Snapshot = {
  items: StripItem[];
  stage: HTMLElement | null;
  activeIndex: number;
  openIndex: number | null;
};

/**
 * Per-frame values.
 * progress: strip position in card units (float). velocity: smoothed, normalised −1…1 (written by StripGL).
 * open: 0 → 1 while the active card unbends and zooms into the case study.
 */
export const motion = { progress: 0, velocity: 0, open: 0 };

const PHONE_MAX = 768;

/** Card size and spacing from the stage width W (spec §2). Shared by the DOM input and the shader. */
export function stripLayout(W: number, viewportW: number) {
  const cardW = viewportW < PHONE_MAX ? 0.82 * W : Math.min(0.56 * W, 860);
  const cardH = (cardW * 10) / 16;
  return { cardW, cardH, pitch: cardW * 1.08, radius: viewportW < PHONE_MAX ? 14 : 18 };
}

let snapshot: Snapshot = { items: [], stage: null, activeIndex: 0, openIndex: null };
const listeners = new Set<() => void>();

function set(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

export const stripStore = {
  get: () => snapshot,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setItems(items: StripItem[]) {
    const activeIndex = Math.min(snapshot.activeIndex, Math.max(0, items.length - 1));
    motion.progress = Math.min(motion.progress, Math.max(0, items.length - 1));
    set({ items, activeIndex });
  },
  setStage(stage: HTMLElement | null) {
    set({ stage });
  },
  setActive(activeIndex: number) {
    if (activeIndex !== snapshot.activeIndex) set({ activeIndex });
  },
  setOpen(openIndex: number | null) {
    set({ openIndex });
  },
};
