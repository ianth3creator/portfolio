"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { motion, stripLayout, stripStore, type StripItem } from "@/lib/strip-store";
import { loadCardTexture, PAPER_2, textureWidth } from "./card-texture";
import { stripFragment, stripVertex } from "./strip-shader";

/**
 * The /projects strip, drawn inside the shared glass canvas (docs/projects-strip.md §5).
 * Renders nothing until ProjectStrip registers its stage element in stripStore.
 */

/** cards further than this from the centre (in card units) are hidden */
const VISIBLE_RANGE = 2.6;
/** px/s that counts as full speed for the wave */
const FULL_SPEED = 2400;

const paper = new THREE.Color().setRGB(
  parseInt(PAPER_2.slice(1, 3), 16) / 255,
  parseInt(PAPER_2.slice(3, 5), 16) / 255,
  parseInt(PAPER_2.slice(5, 7), 16) / 255,
  THREE.LinearSRGBColorSpace, // raw values: the canvas writes sRGB as-is
);

type Card = { mesh: THREE.Mesh; material: THREE.ShaderMaterial };

export function StripGL() {
  // separate selectors, so moving between cards (activeIndex) doesn't re-render the scene
  const items = useSyncExternalStore(stripStore.subscribe, () => stripStore.get().items, () => stripStore.get().items);
  const stage = useSyncExternalStore(stripStore.subscribe, () => stripStore.get().stage, () => null);
  const openIndex = useSyncExternalStore(stripStore.subscribe, () => stripStore.get().openIndex, () => null);
  const group = useRef<THREE.Group>(null);
  const cards = useRef(new Map<number, Card>());
  const last = useRef({ progress: motion.progress });
  const { size } = useThree();
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 64, 16), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // All layout happens here, in one place: per-card frame callbacks would run before this
  // one (React registers child effects first) and lag a frame behind the stage.
  useFrame((state, delta) => {
    const g = group.current;
    if (!g || !stage) return;
    const rect = stage.getBoundingClientRect();
    const onScreen = rect.bottom > -50 && rect.top < size.height + 50 && rect.width > 0;
    g.visible = onScreen;
    if (!onScreen) return;

    g.position.set(rect.left + rect.width / 2 - size.width / 2, -(rect.top + rect.height / 2 - size.height / 2), -100);
    const W = rect.width;
    const { cardW, cardH, pitch, radius } = stripLayout(W, size.width);
    const progress = motion.progress;

    // velocity from how fast the strip moved this frame, whatever moved it (swipe, tween, scroll)
    const dt = Math.max(delta, 1 / 240);
    const raw = ((progress - last.current.progress) * pitch) / dt;
    last.current.progress = progress;
    motion.velocity = THREE.MathUtils.damp(motion.velocity, THREE.MathUtils.clamp(raw / FULL_SPEED, -1, 1), 6, dt);

    // zoom that makes the opened card fill the stage
    const openScale = Math.min(W / cardW, rect.height / cardH);

    cards.current.forEach(({ mesh, material }, index) => {
      const isOpen = openIndex === index;
      mesh.visible = isOpen || Math.abs(index - progress) < VISIBLE_RANGE;
      if (!mesh.visible) return;
      const u = material.uniforms;
      u.uProgress.value = progress;
      u.uPitch.value = pitch;
      u.uSize.value.set(cardW, cardH);
      u.uRadius.value = radius;
      u.uVel.value = motion.velocity;
      u.uTime.value = state.clock.elapsedTime;
      u.uRadiusRest.value = 1.6 * W;
      u.uRadiusFast.value = 0.9 * W;
      u.uFocal.value = 1.2 * W;
      u.uWaveY.value = 0.06 * cardH;
      u.uWaveZ.value = 0.12 * cardW;
      u.uWaveK.value = (2 * Math.PI) / (1.6 * cardW);
      // the centred card goes flat as the strip comes to rest (and curves again as soon as it moves)
      // fully flat below |velocity| 0.01, the same threshold at which ProjectStrip shows the crisp image
      u.uFlat.value = Math.max(0, 1 - Math.abs(index - progress)) * (1 - THREE.MathUtils.smoothstep(Math.abs(motion.velocity), 0.01, 0.12));
      u.uOpen.value = isOpen ? motion.open : 0;
      u.uOpenScale.value = openScale;
      u.uDim.value = openIndex !== null && !isOpen ? motion.open : 0;
      u.uReveal.value = THREE.MathUtils.damp(u.uReveal.value, material.userData.loaded ? 1 : 0, 10, delta);
      // the opened card draws on top of its neighbours
      mesh.renderOrder = isOpen ? 1 : 0;
    });
  });

  if (!stage || !items.length) return null;
  return (
    <group ref={group}>
      {items.map((item, i) => (
        <StripCard key={item.slug} item={item} index={i} geometry={geometry} cards={cards} />
      ))}
    </group>
  );
}

function StripCard({
  item,
  index,
  geometry,
  cards,
}: {
  item: StripItem;
  index: number;
  geometry: THREE.PlaneGeometry;
  cards: React.RefObject<Map<number, Card>>;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const gl = useThree((s) => s.gl);
  const uniforms = useMemo(
    () => ({
      uTex: { value: null as THREE.Texture | null },
      uIndex: { value: 0 },
      uProgress: { value: 0 },
      uPitch: { value: 1 },
      uSize: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: 14 },
      uVel: { value: 0 },
      uTime: { value: 0 },
      uRadiusRest: { value: 1000 },
      uRadiusFast: { value: 600 },
      uFocal: { value: 800 },
      uWaveY: { value: 0 },
      uWaveZ: { value: 0 },
      uWaveK: { value: 0.01 },
      uOpen: { value: 0 },
      uOpenScale: { value: 1 },
      uFlat: { value: 0 },
      uDim: { value: 0 },
      uReveal: { value: 0 },
      uPaper: { value: new THREE.Vector3(paper.r, paper.g, paper.b) },
    }),
    [],
  );

  // register with the parent's frame loop
  useEffect(() => {
    const m = mesh.current;
    const material = mat.current;
    const registry = cards.current;
    if (!m || !material) return;
    material.uniforms.uIndex.value = index;
    registry.set(index, { mesh: m, material });
    return () => {
      registry.delete(index);
    };
  }, [cards, index]);

  useEffect(() => {
    const material = mat.current;
    if (!material) return;
    let cancelled = false;
    let texture: THREE.Texture | null = null;
    // Size the texture for how many pixels the card really covers; a texture below that
    // looks soft (stretched), one far above it looks soft too (the GPU picks a smaller mip).
    const stageW = stripStore.get().stage?.getBoundingClientRect().width ?? window.innerWidth;
    const { cardW } = stripLayout(stageW, window.innerWidth);
    // whichever is denser: the screen, or the canvas (which renders above 1× even on 1× screens)
    const density = Math.max(window.devicePixelRatio || 1, gl.getPixelRatio());
    const width = textureWidth(cardW * Math.min(density, 2.5));
    // Priority: the active card first, then outwards (spec §7)
    const distance = Math.abs(index - stripStore.get().activeIndex);
    const timer = setTimeout(() => {
      loadCardTexture(item, width)
        .then((tex) => {
          if (cancelled || !tex) return tex?.dispose();
          texture = tex;
          gl.initTexture(tex); // upload now, not on the first frame the card is drawn
          material.uniforms.uTex.value = tex;
          material.userData.loaded = true;
        })
        .catch(() => {
          // leave the card on paper; the grid below still links to the project
        });
    }, distance * 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      texture?.dispose();
      material.uniforms.uTex.value = null;
      material.userData.loaded = false;
    };
  }, [gl, item, index]);

  // frustumCulled off: the shader moves vertices far from the unit plane's bounds.
  // alphaToCoverage: smooth rounded corners with MSAA while the mesh stays opaque.
  return (
    <mesh ref={mesh} geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={mat} vertexShader={stripVertex} fragmentShader={stripFragment} uniforms={uniforms} alphaToCoverage />
    </mesh>
  );
}
