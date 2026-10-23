/**
 * Shared state between the /projects strip's DOM side (ProjectStrip: input, buttons, info)
 * and its WebGL side (StripGL, inside the glass canvas). See docs/projects-strip.md §5.
 *
 * - `motion` is mutated every frame (by input or GSAP tweens) and read in useFrame. Never put it in React state.
 * - Everything else changes rarely and notifies subscribers (useSyncExternalStore).
 */

export type StripImage = { publicId: string; width: number; height: number };

export type StripItem = {
  slug: string;
  title: string;
  /** the wide image (cover, else first web screenshot) */
  image?: StripImage;
  /** app-only projects: up to 3 phone screenshots, composited into one card texture */
  phones: StripImage[];
};

type Snapshot = {
  items: StripItem[];
  stage: HTMLElement | null;
  activeIndex: number;
  openIndex: number | null;
};

/** Per-frame values: progress in card units (float), velocity in px/s. */
export const motion = { progress: 0, velocity: 0 };

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
