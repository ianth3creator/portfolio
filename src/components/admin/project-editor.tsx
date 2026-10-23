"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CldImage, CldUploadWidget, type CloudinaryUploadWidgetInfo } from "next-cloudinary";
import { deleteProject, saveProject, signOut } from "@/app/admin/actions";
import type { CloudinaryAsset, Project } from "@/lib/types";

type Draft = Omit<Project, "id" | "updatedAt"> & { id: string | null };
type Update = (prev: CloudinaryAsset[]) => CloudinaryAsset[];

const empty = (order: number): Draft => ({
  id: null,
  slug: "",
  title: "",
  summary: "",
  problem: "",
  role: "",
  stack: [],
  outcome: "",
  liveUrl: "",
  siteName: "",
  appStoreUrl: "",
  playStoreUrl: "",
  repoUrl: "",
  cover: undefined,
  webShots: [],
  appShots: [],
  gallery: [],
  featured: false,
  // new projects go live on save; untick to keep one as a draft
  published: true,
  order,
});

function toAsset(info: CloudinaryUploadWidgetInfo): CloudinaryAsset {
  return {
    publicId: info.public_id,
    width: info.width,
    height: info.height,
    resourceType: info.resource_type === "video" ? "video" : "image",
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const field = "mt-1 w-full rounded-xl border border-line bg-white/70 px-3 py-2 text-sm outline-none focus:border-accent";
const button = "rounded-full border border-line px-4 py-2 text-sm transition-transform active:scale-[0.97]";

export function ProjectEditor({ email, projects }: { email: string; projects: Project[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  // Media lists update through a function of the latest state: a multi-file upload reports each file separately.
  const media = (k: "webShots" | "appShots" | "gallery") => (f: Update) => setDraft((d) => (d ? { ...d, [k]: f(d[k]) } : d));
  const cover = (f: Update) => setDraft((d) => (d ? { ...d, cover: f(d.cover ? [d.cover] : [])[0] } : d));

  function save() {
    if (!draft) return;
    const { id, ...input } = draft;
    start(async () => {
      const res = await saveProject(id, input);
      if (!res.ok) return setError(res.error);
      setError(null);
      setDraft(null);
      router.refresh();
    });
  }

  const folder = `portfolio/${draft?.slug || "untitled"}`;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between text-sm text-ink-2">
        <span>{email}</span>
        <div className="flex gap-2">
          <button className={button} onClick={() => start(async () => { await signOut(); router.refresh(); })}>
            Sign out
          </button>
          <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" onClick={() => setDraft(empty((projects.at(-1)?.order ?? 0) + 10))}>
            New project
          </button>
        </div>
      </div>

      {draft && (
        <div className="glass space-y-6 p-6">
          <Fieldset title="Basics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Title
                <input
                  className={field}
                  value={draft.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    // keep the slug in step with the title until it's edited by hand
                    setDraft((d) => (d ? { ...d, title, slug: d.slug === slugify(d.title) ? slugify(title) : d.slug } : d));
                  }}
                />
              </label>
              <label className="text-sm">
                Slug (the page address)
                <input className={field} value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder="my-project" />
              </label>
            </div>
            <label className="block text-sm">
              One-line summary (shown on the card)
              <input className={field} value={draft.summary} onChange={(e) => set("summary", e.target.value)} maxLength={160} />
            </label>
            <label className="block text-sm">
              Problem it solved
              <textarea className={field} rows={3} value={draft.problem} onChange={(e) => set("problem", e.target.value)} />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm">
                My role
                <input className={field} value={draft.role} onChange={(e) => set("role", e.target.value)} />
              </label>
              <label className="text-sm">
                Stack (comma separated)
                <input className={field} value={draft.stack.join(", ")} onChange={(e) => set("stack", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
              </label>
            </div>
            <label className="block text-sm">
              Outcome (a measurable result)
              <input className={field} value={draft.outcome} onChange={(e) => set("outcome", e.target.value)} />
            </label>
          </Fieldset>

          <Fieldset title="Links" hint="Leave any you don't have empty; only filled ones show as buttons.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Website URL
                <input className={field} value={draft.liveUrl ?? ""} onChange={(e) => set("liveUrl", e.target.value)} placeholder="https://…" />
              </label>
              <label className="text-sm">
                Website name (shown on the browser frame)
                <input className={field} value={draft.siteName ?? ""} onChange={(e) => set("siteName", e.target.value)} placeholder="e.g. fluxpay.app" />
              </label>
              <label className="text-sm">
                App Store URL
                <input className={field} value={draft.appStoreUrl ?? ""} onChange={(e) => set("appStoreUrl", e.target.value)} placeholder="https://apps.apple.com/…" />
              </label>
              <label className="text-sm">
                Google Play URL
                <input className={field} value={draft.playStoreUrl ?? ""} onChange={(e) => set("playStoreUrl", e.target.value)} placeholder="https://play.google.com/…" />
              </label>
              <label className="text-sm">
                Source code URL
                <input className={field} value={draft.repoUrl ?? ""} onChange={(e) => set("repoUrl", e.target.value)} placeholder="https://github.com/…" />
              </label>
            </div>
          </Fieldset>

          <Fieldset title="Cover" hint="Wide image for the project card and the top of the page (16:10 works best).">
            <MediaList
              assets={draft.cover ? [draft.cover] : []}
              onChange={cover}
              folder={folder}
              multiple={false}
              shape="web"
              label={draft.cover ? "Replace cover" : "Upload cover"}
            />
          </Fieldset>

          <Fieldset title="Web screenshots" hint="Desktop screenshots of the site. Shown in a browser frame with the website name.">
            <MediaList assets={draft.webShots} onChange={media("webShots")} folder={folder} shape="web" label="Add web screenshots" />
          </Fieldset>

          <Fieldset title="App screenshots" hint="Phone screenshots (portrait). Shown in phone frames, side by side.">
            <MediaList assets={draft.appShots} onChange={media("appShots")} folder={folder} shape="app" label="Add app screenshots" />
          </Fieldset>

          <Fieldset title="Other media" hint="Videos, diagrams, anything else.">
            <MediaList assets={draft.gallery} onChange={media("gallery")} folder={folder} shape="web" label="Add images / video" />
          </Fieldset>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.published} onChange={(e) => set("published", e.target.checked)} />
              Published {!draft.published && <span className="text-amber-700">(draft: hidden from the site)</span>}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.featured} onChange={(e) => set("featured", e.target.checked)} />
              Featured (full width when first)
            </label>
            <label className="flex items-center gap-2">
              Order
              <input type="number" className="w-20 rounded-lg border border-line bg-white/70 px-2 py-1" value={draft.order} onChange={(e) => set("order", Number(e.target.value))} />
            </label>
          </div>

          {error && <pre className="text-sm whitespace-pre-wrap text-red-700">{error}</pre>}
          <div className="flex gap-2">
            <button disabled={pending} onClick={save} className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper disabled:opacity-50">
              {pending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setDraft(null); setError(null); }} className={button}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {projects.length === 0 && <li className="text-sm text-ink-3">No projects yet.</li>}
        {projects.map((p) => (
          <li key={p.id} className="glass flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-ink-3">
                {p.published ? "Live" : <span className="font-medium text-amber-700">Draft, not on the site</span>} · order {p.order} · {p.webShots.length} web / {p.appShots.length} app shots
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <button
                className="rounded-full border border-line px-3 py-1.5"
                onClick={() =>
                  setDraft({
                    ...p,
                    liveUrl: p.liveUrl ?? "",
                    siteName: p.siteName ?? "",
                    appStoreUrl: p.appStoreUrl ?? "",
                    playStoreUrl: p.playStoreUrl ?? "",
                    repoUrl: p.repoUrl ?? "",
                  })
                }
              >
                Edit
              </button>
              <button
                className="rounded-full border border-line px-3 py-1.5 text-red-700"
                onClick={() => {
                  if (window.confirm(`Delete “${p.title}”? This can't be undone.`))
                    start(async () => {
                      await deleteProject(p.id);
                      router.refresh();
                    });
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fieldset({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left w-full">
        <span className="font-mono text-[11px] tracking-[0.12em] text-ink-3 uppercase">{title}</span>
        {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
      </legend>
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

/** Thumbnails with caption, reorder and remove, plus a signed Cloudinary upload button. */
function MediaList({
  assets,
  onChange,
  folder,
  shape,
  label,
  multiple = true,
}: {
  assets: CloudinaryAsset[];
  onChange: (update: Update) => void;
  folder: string;
  shape: "web" | "app";
  label: string;
  multiple?: boolean;
}) {
  const move = (i: number, by: number) =>
    onChange((prev) => {
      const next = [...prev];
      const [a] = next.splice(i, 1);
      next.splice(i + by, 0, a);
      return next;
    });
  const update = (i: number, patch: Partial<CloudinaryAsset>) => onChange((prev) => prev.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  return (
    <div>
      {assets.length > 0 && (
        <ul className="flex gap-3 overflow-x-auto pb-2">
          {assets.map((a, i) => (
            <li key={a.publicId} className="w-40 shrink-0 space-y-1.5">
              {a.resourceType === "video" ? (
                <div className={`grid place-items-center rounded-xl bg-paper-2 text-xs text-ink-3 ${shape === "app" ? "aspect-[9/19]" : "aspect-[16/10]"}`}>Video</div>
              ) : (
                <CldImage
                  src={a.publicId}
                  width={shape === "app" ? 160 : 320}
                  height={shape === "app" ? 338 : 200}
                  crop="fill"
                  alt=""
                  className={`w-full rounded-xl object-cover ${shape === "app" ? "aspect-[9/19]" : "aspect-[16/10]"}`}
                />
              )}
              {multiple && (
                <input
                  className="w-full rounded-lg border border-line bg-white/70 px-2 py-1 text-xs"
                  placeholder="Caption (optional)"
                  value={a.caption ?? ""}
                  onChange={(e) => update(i, { caption: e.target.value || undefined })}
                />
              )}
              <div className="flex gap-1 text-xs">
                {multiple && (
                  <>
                    <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-full border border-line px-2 py-0.5 disabled:opacity-30">←</button>
                    <button type="button" aria-label="Move right" disabled={i === assets.length - 1} onClick={() => move(i, 1)} className="rounded-full border border-line px-2 py-0.5 disabled:opacity-30">→</button>
                  </>
                )}
                <button type="button" onClick={() => onChange((prev) => prev.filter((_, j) => j !== i))} className="ml-auto rounded-full border border-line px-2 py-0.5 text-red-700">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <CldUploadWidget
        signatureEndpoint="/api/sign-cloudinary-params"
        options={{ folder, multiple, sources: ["local", "url"] }}
        onSuccess={(r) => {
          if (typeof r.info !== "object") return;
          const asset = toAsset(r.info);
          onChange((prev) => (multiple ? [...prev, asset] : [asset]));
        }}
      >
        {({ open }) => (
          <button type="button" className={`${button} mt-2`} onClick={() => open()}>
            {label}
          </button>
        )}
      </CldUploadWidget>
    </div>
  );
}
