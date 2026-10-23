"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { motion, stripStore, type StripItem } from "@/lib/strip-store";
import { loadCardTexture, PAPER_2, textureWidth } from "./card-texture";
import { stripFragment, stripVertex } from "./strip-shader";

/**
 * The /projects strip, drawn inside the shared glass canvas (docs/projects-strip.md §5).
 * Renders nothing until ProjectStrip registers its stage element in stripStore.
 */

const PHONE_MAX = 768;
/** cards further than this from the centre (in card units) are hidden */
const VISIBLE_RANGE = 2.6;

/** Card size and spacing from the stage width W (spec §2). */
export function stripLayout(W: number, viewportW: number) {
  const cardW = viewportW < PHONE_MAX ? 0.82 * W : Math.min(0.56 * W, 860);
  const cardH = (cardW * 10) / 16;
  return { cardW, cardH, pitch: cardW * 1.08 };
}

const paper = new THREE.Color().setRGB(
  parseInt(PAPER_2.slice(1, 3), 16) / 255,
  parseInt(PAPER_2.slice(3, 5), 16) / 255,
  parseInt(PAPER_2.slice(5, 7), 16) / 255,
  THREE.LinearSRGBColorSpace, // raw values: the canvas writes sRGB as-is
);

type Card = { mesh: THREE.Mesh; material: THREE.ShaderMaterial };

export function StripGL() {
  const { items, stage } = useSyncExternalStore(stripStore.subscribe, stripStore.get, stripStore.get);
  const group = useRef<THREE.Group>(null);
  const cards = useRef(new Map<number, Card>());
  const { size } = useThree();
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 64, 16), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // All layout happens here, in one place: per-card frame callbacks would run before this
  // one (React registers child effects first) and lag a frame behind the stage.
  useFrame((_, delta) => {
    const g = group.current;
    if (!g || !stage) return;
    const rect = stage.getBoundingClientRect();
    const onScreen = rect.bottom > -50 && rect.top < size.height + 50 && rect.width > 0;
    g.visible = onScreen;
    if (!onScreen) return;

    g.position.set(rect.left + rect.width / 2 - size.width / 2, -(rect.top + rect.height / 2 - size.height / 2), -100);
    const { cardW, cardH, pitch } = stripLayout(rect.width, size.width);
    const progress = motion.progress;

    cards.current.forEach(({ mesh, material }, index) => {
      mesh.visible = Math.abs(index - progress) < VISIBLE_RANGE;
      if (!mesh.visible) return;
      const u = material.uniforms;
      u.uProgress.value = progress;
      u.uPitch.value = pitch;
      u.uSize.value.set(cardW, cardH);
      u.uReveal.value = THREE.MathUtils.damp(u.uReveal.value, material.userData.loaded ? 1 : 0, 10, delta);
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
    // size the texture to the card's real pixel width (stage width → card width × canvas DPR)
    const stageW = stripStore.get().stage?.getBoundingClientRect().width ?? window.innerWidth;
    const { cardW } = stripLayout(stageW, window.innerWidth);
    loadCardTexture(item, textureWidth(cardW * gl.getPixelRatio()))
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
    return () => {
      cancelled = true;
      texture?.dispose();
      material.uniforms.uTex.value = null;
      material.userData.loaded = false;
    };
  }, [gl, item]);

  // frustumCulled off: the shader moves vertices far from the unit plane's bounds
  return (
    <mesh ref={mesh} geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={mat} vertexShader={stripVertex} fragmentShader={stripFragment} uniforms={uniforms} />
    </mesh>
  );
}
