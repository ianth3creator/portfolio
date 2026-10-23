# Setup

Everything here is on free plans. Total time: about 20 minutes.

## 0. Run it

Use Node 24 LTS (≥ 24.12). The Firebase SDK warns on Node 22 at install time.

```bash
npm install
cp .env.example .env.local     # then fill it in (steps below)
npm run dev                    # http://localhost:3000  — admin at /admin
```

The site runs before any keys are set: the projects list is just empty and the chat uses built-in answers.

## 1. Cloudinary (images and video)

Free plan: 25 credits a month. 1 credit = 1 GB storage, or 1 GB bandwidth, or 1,000 transformations.

1. Sign up at cloudinary.com (Free plan).
2. **Settings → API Keys**: copy **Cloud name**, **API key** and **API secret** into `.env.local`
   (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
3. That's it. Uploads are **signed** by the site, so you don't need an unsigned upload preset.
   Each project's files land in `portfolio/<project-slug>/`.

Keep the API secret private. It only lives in `.env.local` and in Vercel's environment variables.

## 2. Firebase (sign-in for /admin + project data)

Stay on the free **Spark** plan. You don't need Blaze, because the site is hosted on Vercel, not Firebase.

1. console.firebase.google.com → **Add project** (Google Analytics off is fine).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
   Under **Settings → Authorized domains**, add your Vercel domain later (localhost is there already).
3. **Build → Firestore Database → Create database**, production mode. Pick a region near you
   (e.g. `africa-south1` or `europe-west1`). The location can't be changed later.
4. Firestore → **Rules**: paste the contents of `firestore.rules` and publish
   (it blocks all browser access; the site talks to Firestore from the server only).
5. **Project settings → General → Your apps → Web (`</>`)**: register an app, copy
   `apiKey`, `authDomain`, `projectId`, `appId` into the `NEXT_PUBLIC_FIREBASE_*` vars.
6. **Project settings → Service accounts → Generate new private key**. From the downloaded JSON copy
   `project_id`, `client_email`, `private_key` into `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
   `FIREBASE_PRIVATE_KEY` (in double quotes). Don't commit this file — delete it once copied.
7. Set `ADMIN_EMAIL` to the Google account you'll sign in with.

## 3. AI chat (optional, free)

1. Get a key at aistudio.google.com/apikey and set `GOOGLE_GENERATIVE_AI_API_KEY`.
2. The free tier is small (per-day caps, roughly a few hundred requests on Flash-Lite) and Google may use
   free-tier prompts to improve its products. When the quota runs out the chat quietly falls back to
   the built-in answers in `src/lib/knowledge.ts`. **Fill those in with your own words either way.**

## 4. Deploy (Vercel, free Hobby plan)

1. Push to GitHub, import the repo at vercel.com/new.
2. Add every variable from `.env.local` under **Settings → Environment Variables**.
3. Add the Vercel domain (and your custom domain) to Firebase **Authorized domains**.

## 5. Claude Code skills

Run these inside the project folder:

```bash
# Emil Kowalski — motion taste and review
npx skills add https://github.com/emilkowalski/skills

# GSAP official skills
npx skills add https://github.com/greensock/gsap-skills

# UI UX Pro Max — use as a checklist
npm install -g uipro-cli && uipro init --ai claude

# Anthropic frontend-design — avoids the generic AI look
npx skills add https://github.com/anthropics/skills --skill frontend-design

# Vercel — React/Next performance + web design guidelines audits
npx skills add https://github.com/vercel-labs/agent-skills

# Motion AI kit (only needed if you use Motion beyond small presence animations)
npx motion-ai
```

`CLAUDE.md` tells Claude which skill wins when they disagree.

## 6. shadcn/ui (for admin + accessible primitives)

```bash
npx shadcn@latest init
```

## Avatar files

Already in `public/assets/avatar/`:
- `avatar-stacked.mp4`: your Galaxy avatar with the background removed. It's a 540×1080 stacked-alpha video (colour on top, transparency mask below), 24 fps, about 3 MB, and a ping-pong loop with no visible seam.
- `avatar-poster.webp`: a transparent still, shown before the video loads and for people with reduced motion turned on.
- `photo.jpg` (**add this**): your real photo, square, face centred, ~800×800. It's the back of the avatar bubble (tap to flip). Until it exists, `photo-placeholder.svg` shows instead.

To swap in a new avatar clip later, export it with a transparent background (WebM VP9 with alpha, MOV ProRes 4444, or a PNG sequence),
then convert it with ffmpeg (`winget install ffmpeg` on Windows):

```bash
# For WebM input keep "-c:v libvpx-vp9" BEFORE -i (it keeps the alpha). Drop it for .mov input.
ffmpeg -c:v libvpx-vp9 -i avatar.webm -filter_complex "[0:v]fps=24,format=rgba,scale=540:540,split[a][b];[a]format=rgb24[c];[b]alphaextract,format=gray[m];[c][m]vstack" -an -c:v libx264 -pix_fmt yuv420p -crf 30 -preset slow -movflags +faststart avatar-stacked.mp4

# Poster (first frame, keeps transparency)
ffmpeg -c:v libvpx-vp9 -i avatar.webm -frames:v 1 -vf scale=540:540 -c:v libwebp -pix_fmt yuva420p avatar-poster.webp
```

## Glass (React Three Fiber)

Add `data-glass="panel"` to any element to get a real glass slab behind it (it uses the element's size and border radius), or `data-glass="orb"` for a bubble.
Try to keep 8 or fewer on screen at once. Tune the look in `glassProps` in `src/components/glass/glass-scene.tsx`.
Browsers without WebGL fall back to the CSS `.glass` blur automatically.
