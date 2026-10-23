"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FluidSim, fluidSupported } from "./fluid-sim";

/**
 * Full-screen backdrop the glass refracts, in two layers:
 *  1. a slow pastel "ink" field (domain-warped noise on warm off-white), rendered at
 *     quarter resolution since it is all soft gradients;
 *  2. fluid paint you drag through with mouse, pen or finger (FluidSim).
 * Opaque, so three's transmission pass picks it up and every glass body shows the paint.
 */
const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const inkVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const inkFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uRes;
uniform float uScroll;     // px

vec3 paper = vec3(0.973, 0.964, 0.945);

// iq-style value noise
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(vUv.x * aspect, vUv.y + uScroll / uRes.y * 0.35) * 1.6;
  float t = uTime * 0.045;

  // domain warp => slow ink-in-water swirls
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.3), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float n = fbm(p + 2.6 * r);

  // pastel palette (sky, rose, mint, lilac)
  vec3 sky   = vec3(0.70, 0.84, 0.98);
  vec3 rose  = vec3(0.98, 0.76, 0.86);
  vec3 mint  = vec3(0.74, 0.95, 0.84);
  vec3 lilac = vec3(0.84, 0.78, 0.99);
  vec3 col = mix(sky, rose, smoothstep(0.25, 0.75, q.x));
  col = mix(col, mint, smoothstep(0.35, 0.85, r.y));
  col = mix(col, lilac, smoothstep(0.45, 0.9, n));

  // keep most of the page paper-coloured; colour pools where the noise peaks
  float amt = smoothstep(0.5, 0.82, n) * 0.75;
  gl_FragColor = vec4(mix(paper, col, amt), 1.0);
}`;

const compositeFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uInk;
uniform vec2 uInkTexel;
uniform sampler2D uDye;
uniform float uDyeOn;
uniform vec2 uDyeTexel;
uniform float uRelief; // how raised the paint looks
uniform float uMetal;  // 0 = pure luminous colour, 1 = liquid chrome

// Smooth B-spline upscaling from 4 bilinear taps: both textures are lower-res than the
// screen, and plain bilinear shows its grid (stair-stepped edges) when stretched that far.
vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) * (1.0 / 6.0);
}
vec4 smoothSample(sampler2D tex, vec2 uv, vec2 texel) {
  uv = uv / texel - 0.5;
  vec2 f = fract(uv);
  uv -= f;
  vec4 xc = cubic(f.x);
  vec4 yc = cubic(f.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 o = (c + vec4(xc.yw, yc.yw) / s) * texel.xxyy;
  vec4 s0 = texture2D(tex, o.xz);
  vec4 s1 = texture2D(tex, o.yz);
  vec4 s2 = texture2D(tex, o.xw);
  vec4 s3 = texture2D(tex, o.yw);
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

// Density mapped to height with a soft ceiling: the inside of a stroke is a smooth plateau,
// so only its edges bevel and catch the light.
float height(vec2 uv) {
  vec3 d = max(texture2D(uDye, uv).rgb, 0.0);
  return 1.0 - exp(-max(max(d.r, d.g), d.b) * 2.0);
}

void main() {
  // colours are authored in sRGB; the canvas is "flat" (no tone mapping), so write them as-is
  vec3 base = smoothSample(uInk, vUv, uInkTexel).rgb;
  if (uDyeOn < 0.5) {
    gl_FragColor = vec4(base, 1.0);
    return;
  }

  // dye RGB is pigment density: its hue comes from the ratio, its body from the peak
  vec3 d = max(smoothSample(uDye, vUv, uDyeTexel).rgb, 0.0);
  float m = max(max(d.r, d.g), d.b);
  // The +0.06 keeps the hue stable where there's almost no paint (a bare ratio of tiny
  // numbers sparkles); faint fringes fade to white. Then a little white in every colour
  // for the milky pastel, like light through tinted water.
  vec3 hue = mix((d + 0.06) / (m + 0.06), vec3(1.0), 0.22);
  // never fully opaque: the paper shows through so text on top keeps its contrast
  float body = smoothstep(0.0, 0.6, m) * 0.85;

  vec3 paint = hue;
  if (uMetal > 0.001) {
    // slope from two tap widths: a round, buttery bevel
    vec2 o = uDyeTexel * 4.0;
    float hx = height(vUv + vec2(o.x, 0.0)) - height(vUv - vec2(o.x, 0.0))
             + 0.5 * (height(vUv + vec2(2.0 * o.x, 0.0)) - height(vUv - vec2(2.0 * o.x, 0.0)));
    float hy = height(vUv + vec2(0.0, o.y)) - height(vUv - vec2(0.0, o.y))
             + 0.5 * (height(vUv + vec2(0.0, 2.0 * o.y)) - height(vUv - vec2(0.0, 2.0 * o.y)));
    vec3 n = normalize(vec3(-hx * uRelief, -hy * uRelief, 1.0));
    vec3 v = vec3(0.0, 0.0, 1.0);
    vec3 l = normalize(vec3(-0.4, 0.6, 0.7)); // key light from the top left, like the glass rims
    float diffuse = clamp(dot(n, l) * 0.35 + 0.75, 0.0, 1.0);
    float spec = pow(max(dot(n, normalize(l + v)), 0.0), 48.0) * 0.9;
    // chrome: reflect a bright studio horizon with a soft darker band (kept light, never grey)
    vec3 r = reflect(-v, n);
    float env = mix(0.82, 1.06, smoothstep(-0.15, 0.5, r.y)) - 0.16 * exp(-pow(r.y * 5.0, 2.0));
    float fresnel = pow(1.0 - max(n.z, 0.0), 2.0);
    // thin-film iridescence only where the surface tilts (the edges of strokes)
    vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + fresnel * 1.5 + m * 0.4));
    paint = hue * mix(1.0, mix(diffuse, env, 0.7), uMetal);
    paint = mix(paint, film, fresnel * 0.4 * uMetal);
    paint += spec * uMetal;
  }
  // the densest pools glow toward white, like light through ink
  paint = mix(paint, vec3(1.0), smoothstep(0.9, 2.5, m) * 0.3);
  gl_FragColor = vec4(mix(base, clamp(paint, 0.0, 1.0), body), 1.0);
}`;

/** The paint's look. Raise metal toward 1 for liquid chrome, lower relief for flatter strokes. */
const PAINT_LOOK = { relief: 2, metal: 0 };

// Paint colours (sRGB 0..1, written raw like the shader colours; THREE.Color would linearise them).
// Bright, clear pastels so the paint glows on the paper.
const PAINT: [number, number, number][] = [
  [0.5, 0.82, 1.0], // sky
  [1.0, 0.6, 0.78], // pink
  [1.0, 0.86, 0.2], // sun yellow
  [0.5, 0.98, 0.84], // mint
  [0.74, 0.62, 1.0], // lilac
];
const paint = (i: number, t = 0, amount = 1) => {
  const a = PAINT[i % PAINT.length];
  const b = PAINT[(i + 1) % PAINT.length];
  return new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t).multiplyScalar(amount);
};
const INK_SCALE = 0.25;

type Move = { x: number; y: number; dx: number; dy: number };

/** Collects pointer/finger movement in 0..1 screen space (y up). Touch keeps working while the page scrolls. */
function usePointerMoves(enabled: boolean) {
  const queue = useRef<Move[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let last: { x: number; y: number } | null = null;
    const push = (cx: number, cy: number) => {
      const x = cx / window.innerWidth;
      const y = 1 - cy / window.innerHeight;
      if (last) {
        const dx = x - last.x;
        const dy = y - last.y;
        if (dx * dx + dy * dy > 1e-7 && queue.current.length < 24) queue.current.push({ x, y, dx, dy });
      }
      last = { x, y };
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "touch") push(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) push(t.clientX, t.clientY);
    };
    const reset = () => (last = null);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchstart", reset, { passive: true });
    document.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchstart", reset);
      document.removeEventListener("pointerleave", reset);
    };
  }, [enabled]);
  return queue;
}

type Ink = {
  material: THREE.ShaderMaterial;
  scene: THREE.Scene;
  camera: THREE.Camera;
  target: THREE.WebGLRenderTarget;
  dirty: boolean;
};

/** The ink field's own tiny scene, rendered into a quarter-res target. */
function createInk(): Ink {
  const material = new THREE.ShaderMaterial({
    vertexShader: inkVertex,
    fragmentShader: inkFragment,
    uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uScroll: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  return { material, scene: new THREE.Scene().add(quad), camera: new THREE.Camera(), target, dirty: true };
}

export function Backdrop({ animate }: { animate: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const moves = usePointerMoves(animate);
  const hue = useRef(0);
  const ink = useRef<Ink | null>(null);
  const fluid = useRef<FluidSim | null>(null);

  const uniforms = useMemo(
    () => ({
      uInk: { value: null as THREE.Texture | null },
      uDye: { value: null as THREE.Texture | null },
      uDyeOn: { value: 0 },
      uDyeTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
      uInkTexel: { value: new THREE.Vector2(1, 1) },
      uRelief: { value: PAINT_LOOK.relief },
      uMetal: { value: PAINT_LOOK.metal },
    }),
    [],
  );

  useEffect(() => {
    const created = createInk();
    ink.current = created;
    return () => {
      created.target.dispose();
      created.material.dispose();
      ink.current = null;
      fluid.current?.dispose();
      fluid.current = null;
    };
  }, []);

  useEffect(() => {
    const i = ink.current;
    if (!i) return;
    i.target.setSize(Math.max(1, Math.round(size.width * INK_SCALE)), Math.max(1, Math.round(size.height * INK_SCALE)));
    i.material.uniforms.uRes.value.set(size.width, size.height);
    i.dirty = true;
  }, [size.width, size.height]);

  // (Re)build the fluid only when the aspect changes noticeably, so the mobile URL bar
  // showing/hiding doesn't wipe the paint.
  useEffect(() => {
    if (!animate || !fluidSupported(gl)) return;
    const aspect = size.width / size.height;
    if (fluid.current && Math.abs(fluid.current.aspect / aspect - 1) < 0.2) return;
    fluid.current?.dispose();
    const sim = new FluidSim(gl, size.width, size.height, size.width < 700 ? 720 : 1024);
    fluid.current = sim;
    hue.current = Math.random() * PAINT.length;
    // a soft swirl of colour on load, so it's clear the background is alive
    for (let i = 0; i < 5; i++) {
      const x = 0.15 + Math.random() * 0.7;
      const y = 0.15 + Math.random() * 0.7;
      sim.splat(x, y, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, paint(Math.floor(hue.current) + i, 0, 0.8));
    }
  }, [animate, gl, size.width, size.height]);

  useFrame((_, delta) => {
    const m = mat.current;
    const i = ink.current;
    if (!mesh.current || !m || !i) return;
    mesh.current.scale.set(size.width, size.height, 1);
    const dt = Math.min(delta, 1 / 30);

    const u = i.material.uniforms;
    const scroll = window.scrollY;
    if (animate || i.dirty || u.uScroll.value !== scroll) {
      if (animate) u.uTime.value += dt;
      u.uScroll.value = scroll;
      gl.setRenderTarget(i.target);
      gl.render(i.scene, i.camera);
      gl.setRenderTarget(null);
      i.dirty = false;
    }
    m.uniforms.uInk.value = i.target.texture;
    m.uniforms.uInkTexel.value.set(1 / i.target.width, 1 / i.target.height);

    const sim = fluid.current;
    if (sim) {
      for (const mv of moves.current.splice(0)) {
        hue.current = (hue.current + Math.hypot(mv.dx, mv.dy) * 2.5) % PAINT.length;
        const amount = Math.min(0.4, 0.12 + Math.hypot(mv.dx, mv.dy) * 6);
        sim.splat(mv.x, mv.y, mv.dx, mv.dy, paint(Math.floor(hue.current), hue.current % 1, amount));
      }
      sim.step(dt);
      m.uniforms.uDye.value = sim.texture;
      m.uniforms.uDyeTexel.value = sim.texel;
      m.uniforms.uDyeOn.value = 1;
    } else {
      m.uniforms.uDyeOn.value = 0;
    }
  });

  return (
    <mesh ref={mesh} position={[0, 0, -600]} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={compositeFragment} uniforms={uniforms} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
