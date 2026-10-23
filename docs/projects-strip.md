# Projects — the bending strip

Spec for the `/projects` page centrepiece. Read `CLAUDE.md` first; everything here follows its look, motion and performance rules.

Reference: a horizontal strip of project screenshots that bends in 3D like a ribbon as it moves (TikTok screen recording Ian shared). We are building **only the strip**, not the hexagon ring from the same video.

---

## 1. What we're trying to achieve

A client lands on `/projects` and the work is the first thing they touch. Big, wide screenshots sit on a gently curved strip, like they're on the inside of a very wide cylinder. When you drag, swipe or scroll, the strip comes alive: it flexes into a soft wave that grows with speed, then settles back to calm and snaps the nearest project to the centre. The project under the strip is named in big type, with its one-line result. Tapping the centred card unbends it and zooms it into the case study.

It has to feel **physical and restrained**, not like a demo:

- **Calm at rest.** The centre card is almost flat and readable. Only the edges curve away.
- **Motion comes from the user.** The wave amplitude is driven by velocity. Nothing wobbles on its own.
- **Matches the site.** The cards are on warm off-white with the existing fluid and glass. Thin bright glass rims replace the reference's heavy black edges.
- **Fast on a mid-range Android.** It holds 60 fps and has no texture-upload hitches.

## 2. Layout

```
 /projects
 ┌───────────────────────────────────────────────────────────────┐
 │ SELECTED WORK                                                 │  ← SectionHead (existing)
 │ Things I've designed and built.                               │
 │                                                               │
 │   ╲‾‾‾‾‾╲   ┌───────────────────────┐   ╱‾‾‾‾‾╱               │
 │    ╲ prev╲  │                       │  ╱ next╱                │  ← STAGE (WebGL, in the
 │     ╲    ╲  │     ACTIVE PROJECT    │ ╱     ╱                 │     shared glass canvas)
 │      ╲____╲ │     (almost flat)     │╱_____╱                  │
 │             └───────────────────────┘                         │
 │                                                               │
 │  03 / 08  ━━━━━━━━━━━━━━━━━━──────────────     (‹)  (›)       │  ← index, progress line,
 │                                                               │     prev/next (glass)
 │  FluxPay                                                      │  ← title (changes with
 │  Cut checkout time from 90s to 20s.                           │     active card)
 │  WEB · IOS · NEXT.JS · STRIPE · FIREBASE                      │
 │  [ View case study → ]                                        │  ← glass panel button
 │                                                               │
 │  ── All projects ───────────────────────────────────────────  │  ← the existing grid,
 │  ┌──────────┐ ┌──────────┐                                    │     kept below as the
 │  │          │ │          │                                    │     plain list
 └───────────────────────────────────────────────────────────────┘
```

Sizes (CSS px, measured from the stage's width `W`):

| | Phone (< 768px) | Desktop |
|---|---|---|
| Card width `w` | `0.82 × W` | `min(0.56 × W, 860)` |
| Card height | `w × 10/16` | `w × 10/16` |
| Gap | `0.08 × w` | `0.08 × w` |
| Stage height | `card height × 1.35` (room for the wave) | same |
| Visible cards | active + a slice of each neighbour | active + 1–2 each side |

## 3. How it moves (states)

```
            drag / swipe / scroll starts
   ┌────────┐ ─────────────────────────▶ ┌──────────┐
   │  REST  │                            │  MOVING  │  wave amp = |velocity|
   │ gentle │ ◀───────────────────────── │  flexes  │  curve tightens
   │ curve  │   snap to nearest card     └──────────┘
   └────────┘   (0.6s, power3.out)            │
       │  tap / Enter on the active card      │ tap a side card
       ▼                                      ▼
   ┌────────┐                            snaps that card to centre
   │ OPEN   │  card unbends to flat, scales up to fill the stage,
   │        │  everything else fades to paper (≈ 550ms), then
   └────────┘  router.push(`/projects/${slug}`); the page's
               existing .page-enter fade finishes the transition
```

- **Entrance** (the first time the stage scrolls into view): cards slide in from the right, flat. A velocity impulse makes them flex once and settle (~900ms). Skipped for reduced motion.
- **Info swap** (when the active index changes): the old title goes y −8px and fades in 120ms. The new title comes in by words (SplitText, stagger 0.02, 260ms, power3.out). The summary, outcome and tags crossfade. **Never animate info on every frame, only when the index changes.**
- **Ends:** the strip doesn't loop. Dragging past the first or last card rubber-bands: overshoot × 0.35, springs back.

## 4. Input

There is a single source of truth per device type:

| | Desktop (`pointer: fine` and width ≥ 1024) | Touch / small screens |
|---|---|---|
| Main input | **Vertical page scroll**: ScrollTrigger pins the strip section; scroll distance = `(n − 1) × 70vh`, scrubbed to progress | **Horizontal swipe** on the stage (`touch-action: pan-y`, so vertical page scroll still works) |
| Also works | Mouse drag (`cursor: grab`/`grabbing`) and trackpad horizontal swipe (wheel `deltaX`). Both move the page scroll via `lenis.scrollTo(..., { immediate: true })`, so scroll stays the source of truth | Prev/next buttons |
| Snap | ScrollTrigger `snap` to card positions, after scroll ends | On release: `target = current + releaseVelocity × 0.25`, rounded to the nearest card, then tweened 0.6s `power3.out` |
| Keyboard | The stage is focusable. ← → move one card; Enter opens; Home/End go to first/last | same |

With 0 projects, keep the existing empty message. With 1 project, show one flat card with no drag and no pin. With 2–3 projects, no pin on desktop: use drag/buttons only.

## 5. Architecture

The strip renders **inside the existing glass canvas** (`components/glass/glass-scene.tsx`), not in a second canvas. A second WebGL context would double GPU memory on phones, and being in the same scene means glass panels (header, buttons) refract the strip for free.

```
 app/(site)/projects/page.tsx  (server)
   └─ <ProjectStrip projects={…}/>   (client, DOM)
        • renders the STAGE div (data-strip), info block, buttons, sr-only list
        • owns input (scroll / drag / swipe / keys) and writes to stripStore
        • subscribes to activeIndex for the DOM info swap

 lib/strip-store.ts   (plain module, no React state per frame)
   items[]   { slug, title, textureUrl | phoneUrls[], aspect }
   progress  current position in card units (float), written by input each frame
   velocity  smoothed, px/s
   activeIndex, openIndex|null
   subscribe(listener) for low-frequency changes (items, activeIndex, open)

 components/glass/glass-scene.tsx
   └─ <StripGL/>   (new: components/glass/strip/strip-gl.tsx)
        • reads stripStore in useFrame (refs only; no setState per frame)
        • finds the [data-strip] element, tracks its rect like useTrack does
        • one <mesh> per card, sharing one PlaneGeometry(1, 1, 64, 16)
        • one ShaderMaterial per card (shared shader, per-card uniforms)
```

New files:

- `src/lib/strip-store.ts`
- `src/components/projects/project-strip.tsx`: DOM, input, info, fallback
- `src/components/glass/strip/strip-gl.tsx`: meshes and textures
- `src/components/glass/strip/strip-shader.ts`: GLSL
- `src/components/glass/strip/card-texture.ts`: Cloudinary URL and app-only composite

Edit:

- `glass-scene.tsx`: mount `<StripGL/>` inside `Scene`
- `app/(site)/projects/page.tsx`: use `<ProjectStrip/>` above the existing grid
- `components/home/projects.tsx`: keep the grid, retitled "All projects" when the strip is shown

## 6. The shader

All in **mesh-local CSS px**. The mesh sits at the stage's centre. The canvas camera is orthographic (1 unit = 1px), so **perspective is faked in the vertex shader**. That keeps one camera for the whole site.

**Vertex** (per vertex of card `i`, local position `(lx, ly)` in px):

```glsl
float X = (uIndex - uProgress) * uPitch + lx;     // distance from stage centre along the strip
float Y = ly;

// 1. bend onto a cylinder (edges recede)
float R = mix(uRadiusRest, uRadiusFast, abs(uVel)); // e.g. rest 1.6·W, fast 0.9·W
float th = X / R;
float Xb = R * sin(th);
float Z  = -R * (1.0 - cos(th));

// 2. velocity wave (the ribbon S-curve)
Y += uVel * uWaveY * sin(X * uWaveK + uTime * 0.6);       // uWaveY ≈ 0.06·h, uWaveK ≈ 2π / (1.6·w)
Z += abs(uVel) * uWaveZ * cos(X * uWaveK);                // uWaveZ ≈ 0.12·w

// 3. fake perspective
float s = uFocal / (uFocal - Z);                         // uFocal ≈ 1.2·W
gl_Position = projectionMatrix * modelViewMatrix * vec4(Xb * s, Y * s, Z * 0.01, 1.0);
vTheta = th; vUv = uv; vLocal = vec2(lx, ly);
```

`uVel` is smoothed velocity normalised to −1…1 (`clamp(v / 2400, -1, 1)`). Smooth it with `THREE.MathUtils.damp(vel, raw, 6, dt)`, so a flick swells and then relaxes.

**Fragment:**

- **Rounded corners:** rounded-rect SDF in px (radius 18px desktop, 14px phone). `discard` outside, so the mesh stays **opaque**. Opaque meshes get into the transmission pass, so the glass refracts them; transparent ones don't.
- **Glass rim:** within 1.5px of the edge, mix 35% toward white.
- **Shading from the bend:** `shade = 1.0 - 0.22 * (1.0 - cos(vTheta))` darkens the parts turning away. Add a soft specular band, `exp(-pow((vTheta - 0.35) * 6.0, 2.0)) * 0.10`, so light slides across the cards as they move.
- **Velocity colour split:** offset the red and blue texture reads by `uVel * 0.003` in uv.x. Keep it barely visible; it's a hint of speed, not a glitch effect.
- **Load-in:** `uReveal` 0→1 crossfades from `--paper-2` to the texture when it arrives (300ms).
- **Open state:** `uOpen` 0→1 lerps the bend, wave and shading to zero (a flat card), while the DOM scales the stage's card target. Do the zoom by animating the card's scale uniform in the shader, not via CSS.

## 7. Images

- **URL:** use `getCldImageUrl` from next-cloudinary, with `crop: "fill"`, `gravity: "north"`, 16:10, and `format: "auto"`. Width is 1280 on desktop or 800 on phones; use the 1600 version for the active card on desktop if DPR ≥ 2.
- **Image source:** use `wideImage(project)` from `lib/project-utils.ts` (the cover, else the first web screenshot).
- **App-only projects** (no wide image): build a `CanvasTexture` that mirrors `CardMedia` in `components/home/projects.tsx`. That's up to 3 phone shots on `--paper-2`, the middle one raised, with rounded corners.
- **Loading:** load in priority order (active, then ±1, then ±2, then the rest). Call `gl.initTexture(tex)` right after load, so the GPU upload doesn't stall the first frame the card appears.
- **Texture settings:** `crossOrigin = "anonymous"`, `colorSpace = SRGBColorSpace`, `anisotropy = 4`, mipmaps on.
- **Cleanup:** dispose of textures and materials on unmount (navigating away from `/projects`).

## 8. Accessibility and fallbacks

- **The stage:** `role="region"`, `aria-roledescription="carousel"`, `aria-label="Selected projects"`. It's focusable and has a visible focus ring.
- **Screen readers:** an `aria-live="polite"` line announces "Project 3 of 8: FluxPay". Prev/next buttons are real `<button>`s with labels, at least 44px.
- **The grid below stays:** it is the plain list of links for screen readers, search engines and anyone who prefers it.
- **Reduced motion or no WebGL:** don't render `StripGL`. The stage becomes a CSS scroll-snap row of the existing glass cards (`CardMedia`), with no bend, no wave, no pin and instant snaps. Use `useReducedMotion()` and the `html[data-glass=webgl]` flag.
- **Off screen:** when the stage is off screen, skip the strip's `useFrame` work (same visibility test as `useTrack`).

## 9. Performance budget

- One shared geometry (64×16 segments). At most ~5 cards visible; hide the others (`visible = false`).
- No React state updates per frame. Input writes to the store; `useFrame` reads refs.
- Textures: ≤ 1280px wide (1600 only for the active card on 2× desktop), max ~8 resident.
- The strip doesn't count toward the ≤ 8 glass bodies, but the info button and prev/next do. Keep the page total within the limit.
- Target: 60 fps while flicking on a mid-range Android, and no long tasks > 50ms when cards load.

## 10. Build order

Each phase should end with something viewable on a phone.

1. **Data and static cards.** Create the store, `ProjectStrip` with the stage div, `StripGL` with flat textured cards at the right positions, and the buttons moving one card at a time. *Check: cards line up exactly with the stage at every viewport width and while page-scrolling.*
2. **Bend and perspective.** Add the vertex shader cylinder and fake perspective, rounded corners, rim and shading. *Check: at rest the centre card reads flat and sharp, and the edges recede.*
3. **Input and physics.** Add swipe with inertia and snap, the desktop scroll pin with drag sync, keyboard, rubber-band ends, and the velocity wave and colour split. *Check: a fast flick waves visibly and settles in under 0.8s; slow drags stay calm.*
4. **Info and transitions.** Add the index, progress line, title swap with SplitText, the entrance, and the open-to-case-study transition. *Check: no info animation runs while just scrolling past.*
5. **Fallbacks, accessibility, performance.** Add the reduced-motion/no-WebGL scroll-snap row, aria and the live region, texture priority with `initTexture`, and disposal. Profile on a real Android phone. *Check: Lighthouse a11y is still 100; 60 fps while flicking.*

## 11. Done when

- [ ] Rest state looks calm and premium on a phone: centre card flat, edges curving away, glass rims, no jaggies.
- [ ] Flick → visible ribbon wave proportional to speed → settles and snaps to a card.
- [ ] Desktop: scrolling the page moves the strip (pinned); drag and trackpad work and stay in sync.
- [ ] Tapping the centred card unbends and zooms it, and lands on the case study with no flash.
- [ ] Adding or removing a project in `/admin` updates the strip with no code change.
- [ ] Reduced motion and no-WebGL both give a usable snap row; keyboard and screen reader work.
- [ ] 60 fps on a mid-range Android while flicking; `npm run build` and `npm run lint` pass.
