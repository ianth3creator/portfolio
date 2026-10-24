"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial, PerformanceMonitor } from "@react-three/drei";
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
      // Only real glass values: <html data-glass="webgl"> (the flag that switches the CSS blur off)
      // also carries the attribute, and matching it put a full-screen glass slab in front of the
      // whole page, refracting, shrinking and softening everything behind it.
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-glass="panel"], [data-glass="orb"]'));
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

/**
 * A thin glass slab whose corners match the element's CSS radius. drei's RoundedBox caps the
 * corner radius at half the depth, which on thin glass gave square corners behind rounded cards;
 * extruding a rounded rectangle keeps the face's radius independent of the thickness.
 */
function slabGeometry(w: number, h: number, r: number, depth: number) {
  const bevel = Math.min(2.5, depth * 0.35);
  // the bevel grows the outline, so draw the face that much smaller
  const x = -w / 2 + bevel, y = -h / 2 + bevel, sw = w - bevel * 2, sh = h - bevel * 2;
  const cr = Math.max(0, Math.min(r - bevel, sw / 2, sh / 2));
  const shape = new THREE.Shape();
  shape.moveTo(x + cr, y);
  shape.lineTo(x + sw - cr, y);
  shape.quadraticCurveTo(x + sw, y, x + sw, y + cr);
  shape.lineTo(x + sw, y + sh - cr);
  shape.quadraticCurveTo(x + sw, y + sh, x + sw - cr, y + sh);
  shape.lineTo(x + cr, y + sh);
  shape.quadraticCurveTo(x, y + sh, x, y + sh - cr);
  shape.lineTo(x, y + cr);
  shape.quadraticCurveTo(x, y, x + cr, y);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 16,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

function Panel({ el }: { el: HTMLElement }) {
  const { ref, w, h, r } = useTrack<THREE.Mesh>(el);
  // Thin, gently refracting panels: thick slabs (14-28px, ior 1.35) bent the background hard at
  // the bevels and read as chunky acrylic edges. The orb keeps the stronger glass.
  const depth = Math.min(10, Math.max(6, h * 0.12));
  const geometry = useMemo(() => (w && h ? slabGeometry(w, h, r, depth) : null), [w, h, r, depth]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return <mesh ref={ref} />;
  return (
    <mesh ref={ref} geometry={geometry}>
      <MeshTransmissionMaterial {...glassProps} ior={1.2} thickness={depth * 1.2} clearcoatRoughness={0.3} />
    </mesh>
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
