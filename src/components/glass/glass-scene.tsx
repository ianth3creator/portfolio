"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial, PerformanceMonitor, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { Backdrop } from "./backdrop";
import { StripGL } from "./strip/strip-gl";
import { stripStore } from "@/lib/strip-store";

/**
 * One fixed, full-screen canvas behind the page. Every DOM element with a
 * `data-glass` attribute gets a real glass body (refraction, chromatic aberration,
 * specular highlights) positioned exactly behind it each frame.
 *
 *   data-glass="panel"  → rounded slab matching the element's size + border-radius
 *   data-glass="orb"    → glass sphere (the avatar bubble)
 *
 * Orthographic camera at zoom 1, so 1 world unit = 1 CSS pixel.
 * All glass shares three's single transmission pass (transmissionSampler) — cheap on phones.
 */

type Target = { id: number; el: HTMLElement; kind: "panel" | "orb" };

function useGlassTargets() {
  const [targets, setTargets] = useState<Target[]>([]);
  useEffect(() => {
    const ids = new WeakMap<HTMLElement, number>();
    let next = 1;
    const scan = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-glass]"));
      // Any DOM change in the page triggers a scan (text swaps, animations adding spans), but the
      // glass scene only needs to re-render when the set of glass elements actually changes.
      setTargets((prev) => {
        if (prev.length === els.length && prev.every((t, i) => t.el === els[i] && t.kind === (els[i].dataset.glass === "orb" ? "orb" : "panel"))) return prev;
        return els.map((el) => {
          if (!ids.has(el)) ids.set(el, next++);
          return { id: ids.get(el)!, el, kind: el.dataset.glass === "orb" ? "orb" : "panel" };
        });
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-glass"] });
    return () => mo.disconnect();
  }, []);
  return targets;
}

/**
 * Positions a mesh behind its element every frame and hides it when off screen.
 * Returns the ref to attach and the element's current CSS size + corner radius.
 */
function useTrack<T extends THREE.Object3D>(el: HTMLElement) {
  const ref = useRef<T>(null);
  const { size } = useThree();
  const [dims, setDims] = useState({ w: 0, h: 0, r: 0 });
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const rect = el.getBoundingClientRect();
    const visible = rect.bottom > -50 && rect.top < size.height + 50 && rect.width > 0;
    m.visible = visible;
    if (!visible) return;
    m.position.x = rect.left + rect.width / 2 - size.width / 2;
    m.position.y = -(rect.top + rect.height / 2 - size.height / 2);
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w !== dims.w || h !== dims.h) {
      const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      setDims({ w, h, r: Math.min(r, w / 2, h / 2) });
    }
  });
  return { ref, ...dims };
}

/*
  Cost note: drei defaults to 10 samples, and with chromatic aberration each sample is 3
  refraction reads, plus a fractal-noise distortion per pixel. That alone took a mid-range
  GPU from 61 to 18 fps. Panels are clear, flat glass (no roughness, aberration or distortion),
  so every sample would read the same pixel: one is enough. The orb is the same, plus a smooth
  wobble; any random per-pixel effect (aberration, roughness) shows as grain at these sample counts.
  Scene units are CSS pixels, so distortionScale is per pixel: 0.008 = one wave per ~125px
  (0.4 meant one every 2.5px, which read as grain).
*/
const glassProps = {
  transmissionSampler: true,
  samples: 1,
  transmission: 1,
  // Clear glass. The material fakes frosting (roughness, anisotropicBlur) by jittering every pixel
  // at random, which with only a few samples shows up as grain over the paint.
  roughness: 0,
  ior: 1.35,
  chromaticAberration: 0, // 3x the reads; the CSS rim carries the iridescence on panels
  anisotropicBlur: 0,
  distortion: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.15,
  attenuationColor: new THREE.Color("#ffffff"),
  attenuationDistance: 2000,
  color: new THREE.Color("#ffffff"),
  envMapIntensity: 0.9,
} as const;

function Panel({ el }: { el: HTMLElement }) {
  const { ref, w, h, r } = useTrack<THREE.Mesh>(el);
  if (!w || !h) return <mesh ref={ref} />;
  const depth = Math.min(28, Math.max(14, h * 0.35));
  return (
    <RoundedBox
      key={`${w}x${h}x${r}`}
      ref={ref}
      args={[w, h, depth]}
      radius={Math.max(1, Math.min(r, depth / 2 - 0.5))}
      smoothness={6}
      bevelSegments={6}
      creaseAngle={0.6}
    >
      <MeshTransmissionMaterial {...glassProps} thickness={depth * 2.2} />
    </RoundedBox>
  );
}

function Orb({ el }: { el: HTMLElement }) {
  const { ref, w } = useTrack<THREE.Mesh>(el);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 96, 64), []);
  useFrame((state) => {
    if (!ref.current) return;
    // flatten into a lens so it reads as a bubble, not a ball
    const s = w / 2;
    ref.current.scale.set(s, s, s * 0.55);
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
  });
  return (
    <mesh ref={ref} geometry={geo}>
      <MeshTransmissionMaterial {...glassProps} thickness={w * 0.6} samples={1} chromaticAberration={0} distortion={0.4} distortionScale={0.008} temporalDistortion={0.05} roughness={0} />
    </mesh>
  );
}

function Scene({ animate }: { animate: boolean }) {
  const targets = useGlassTargets();
  return (
    <>
      <Backdrop animate={animate} />
      {/* Studio lights baked into a tiny env map: gives the glass its highlights with no HDR download */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={3} position={[0, 5, -2]} scale={[10, 3, 1]} />
        <Lightformer intensity={1.5} position={[-6, 1, 1]} scale={[3, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer intensity={1.5} position={[6, -1, 1]} scale={[3, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer intensity={0.6} color="#ffd9ec" position={[0, -5, 2]} scale={[10, 2, 1]} />
      </Environment>
      {/* /projects bending strip; draws nothing until that page registers its stage */}
      <StripGL />
      {targets.map((t) => (t.kind === "orb" ? <Orb key={t.id} el={t.el} /> : <Panel key={t.id} el={t.el} />))}
    </>
  );
}

export default function GlassScene({ animate }: { animate: boolean }) {
  // Phones render the canvas at 1.5x, desktops at 1.75x (the text is HTML and always sharp).
  // While the /projects strip is mounted it shows screenshots, so it gets up to 2x (the device's
  // density, capped). Drops to 1x when the frame rate can't hold, climbs back if it recovers.
  const [baseDpr] = useState(() => (window.matchMedia("(pointer: coarse)").matches ? 1.5 : 1.75));
  const stripOn = useSyncExternalStore(stripStore.subscribe, () => stripStore.get().stage !== null, () => false);
  const maxDpr = stripOn ? Math.max(baseDpr, Math.min(window.devicePixelRatio || 1, 2)) : baseDpr;
  const [lowered, setLowered] = useState(false);
  const dpr = lowered ? 1 : maxDpr;
  useEffect(() => {
    document.documentElement.dataset.glass = "webgl";
    return () => {
      delete document.documentElement.dataset.glass;
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        orthographic
        flat
        linear
        camera={{ position: [0, 0, 1000], zoom: 1, near: 1, far: 3000 }}
        dpr={dpr}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        eventPrefix="client"
        onCreated={({ gl }) => {
          gl.transmissionResolutionScale = 0.75; // below 1 is cheaper; lower than this and paint behind glass looks pixelated
        }}
      >
        <PerformanceMonitor flipflops={3} onDecline={() => setLowered(true)} onIncline={() => setLowered(false)} onFallback={() => setLowered(true)} />
        <Scene animate={animate} />
      </Canvas>
    </div>
  );
}
