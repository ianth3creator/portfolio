import type Lenis from "lenis";

/**
 * The page's Lenis instance (created in components/providers/smooth-scroll.tsx), for code that
 * needs to drive scrolling, like the /projects strip. Null with reduced motion (native scroll).
 */
let instance: Lenis | null = null;

export const setLenis = (lenis: Lenis | null) => {
  instance = lenis;
};
export const getLenis = () => instance;
