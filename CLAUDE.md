@AGENTS.md

# Ian's portfolio — project brief

## What this is
Personal portfolio for Ian: senior software engineer, software architect, AI engineer.
Headline: **"Hi, I'm Ian" / "The Software Engineer."** Roles go in a quiet line underneath — no typing effects, no rotating words.
Goal: a client opens it and within five seconds thinks "this person is good". Nothing tacky, nothing that looks AI-generated.

## Look and feel
- **Light and airy on warm off-white** (`--paper`), never plain #fff. Subtle paper grain is already on `body`.
- **Glass everywhere, done properly**: `.glass` in `globals.css` (blur + saturate + specular rim + soft shadow). Glass only reads when there is colour behind it — that's what the background layer is for.
- **One accent colour** (`--accent`). Iridescence lives only in the background fluid and the glass rims. No purple gradients on text, no emoji, no gradient buttons.
- Type: Host Grotesk for everything, Geist Mono for small uppercase labels. Tight tracking on display sizes.
- Mobile first. The reference was a phone; most visitors will be on mid-range Android.

## Signature pieces
1. **Avatar orb** (`src/components/avatar/`): stacked-alpha video (colour top half, mask bottom half) drawn by WebGL so it's transparent in every browser. Head breaks out of the top of a glass bubble. Tap flips to the real photo (`photoSrc`). Pauses when off screen or flipped.
2. **WebGL glass layer** (`src/components/glass/`): one fixed React Three Fiber canvas behind the page. `backdrop.tsx` is a pastel domain-warped ink field (rendered at quarter res) plus drag-to-paint fluid (`fluid-sim.ts`, stable-fluids solver on half-float targets; mouse, pen and touch, also while scrolling). Any element with `data-glass="panel"` or `data-glass="orb"` gets a real glass body (drei `MeshTransmissionMaterial`, `transmissionSampler` so all glass shares ONE transmission pass) tracked to its DOM rect every frame. When it runs, `html[data-glass=webgl]` switches the CSS blur off. No WebGL → CSS `.glass` fallback. Keep visible glass bodies ≲ 8; canvas DPR 1.5 on touch / 1.75 desktop, dropping to 1 via drei `PerformanceMonitor`; transmission buffer at 0.75 scale (lower looks pixelated behind glass). Glass is clear: `roughness`, `anisotropicBlur` and `chromaticAberration` all add per-pixel random jitter that shows as grain at low sample counts, so they stay 0 and `samples` is 1. Scene units are CSS px, so the orb's `distortionScale` is tiny (0.008). Paint is sampled with a bicubic filter in `backdrop.tsx`, so its textures can stay below screen resolution without stair-stepping.
3. **"Ask me anything"** (`components/chat`, `app/api/chat`): Gemini free tier when `GOOGLE_GENERATIVE_AI_API_KEY` is set, otherwise/fallback built-in answers from `lib/knowledge.ts`. The AI may only use those facts + project data.
4. **Glass tuning** (see also the cost note there) lives in `glassProps` in `glass-scene.tsx` (roughness, ior, chromaticAberration, distortion). Tune on a real mid-range Android phone.
5. **Pages**: `/` (hero + chat), `/about`, `/projects`, `/projects/[slug]`, `/skills`, `/contact`, all in `app/(site)` so the glass canvas stays mounted across navigation. `template.tsx` gives each page a short fade-up.
6. **Projects bending strip** (in progress): full spec in `docs/projects-strip.md`. Renders inside the shared glass canvas; read that file before touching `/projects`.

## Architecture
- Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript, Tailwind v4.
- **Content**: projects live in Firestore (`projects` collection), media in Cloudinary. `/admin` (Google sign-in, single allowed email) edits them. Saving calls `updateTag("projects")` so the public site updates immediately — no git push for content.
- `getProjects()` is `'use cache'` + `cacheTag("projects")`. Anything reading cookies must sit inside `<Suspense>`.
- Firestore is only accessed server-side with the Admin SDK; client rules deny everything.
- Images: always `CldImage` (auto format/quality). Upload widget is signed via `/api/sign-cloudinary-params` (admin session required).

## Motion rules (priority order when skills disagree)
1. **Emil Kowalski skills decide *whether* and *how* something moves** (timing, easing, restraint). UI entrances < 400ms, ease-out; nothing animates on every scroll tick unless it earns it; press states scale ~0.97.
2. **GSAP skills decide implementation**: `useGSAP` with a scope, `contextSafe` for handlers, ScrollTrigger for scroll, SplitText for type. Lenis is the only smooth-scroll (already synced to GSAP ticker in `components/providers/smooth-scroll.tsx`) — never add ScrollSmoother.
3. Motion (motion.dev) is allowed only for small presence/layout animations (e.g. chat messages). Never animate the same element with both.
4. UI UX Pro Max is a **checklist** (accessibility, contrast, touch targets, glassmorphism pitfalls), not a source of visual style.
5. Every animation respects `prefers-reduced-motion` (`hooks/use-reduced-motion.ts`).

## Quality bar
- Lighthouse mobile ≥ 90 performance, 100 accessibility.
- Max ~8 `data-glass` bodies visible at once; profile on a mid-range Android phone.
- Test on a real Android phone and Safari/iOS before calling anything done.
