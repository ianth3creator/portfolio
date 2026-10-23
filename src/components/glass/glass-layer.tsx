"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const GlassScene = dynamic(() => import("./glass-scene"), { ssr: false });

function webglSupported() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const noop = () => () => {};

/**
 * Loads the WebGL glass after hydration. Without WebGL the page keeps the CSS
 * `.glass` fallback (blur + rim) and the static colour background.
 */
export function GlassLayer() {
  const reduced = useReducedMotion();
  const supported = useSyncExternalStore(noop, webglSupported, () => false);
  if (!supported) return <StaticBackdrop />;
  return (
    <>
      <StaticBackdrop />
      <GlassScene animate={!reduced} />
    </>
  );
}

/** Shown before the canvas loads and as the no-WebGL fallback. */
function StaticBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute top-[8%] left-[-10%] size-[55vmax] rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.86 0.09 230), transparent 65%)" }} />
      <div className="absolute top-[30%] right-[-15%] size-[50vmax] rounded-full opacity-45 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.88 0.08 330), transparent 65%)" }} />
      <div className="absolute bottom-[-20%] left-[20%] size-[50vmax] rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.9 0.09 150), transparent 65%)" }} />
    </div>
  );
}
