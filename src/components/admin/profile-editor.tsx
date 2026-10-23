"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/admin/actions";
import type { ProfileContent } from "@/lib/types";

const field = "w-full rounded-xl border border-line bg-white/70 px-3 py-2 text-sm outline-none focus:border-accent";
const small = "rounded-full border border-line px-3 py-1 text-xs transition-transform active:scale-[0.97] disabled:opacity-30";
const legend = "font-mono text-[11px] tracking-[0.12em] text-ink-3 uppercase";

/** Moves item i by `by` places in a copy of the list. */
function moved<T>(list: T[], i: number, by: number) {
  const next = [...list];
  next.splice(i + by, 0, ...next.splice(i, 1));
  return next;
}

export function ProfileEditor({ initial }: { initial: ProfileContent }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const edit = (patch: Partial<ProfileContent>) => {
    setSaved(false);
    setP((prev) => ({ ...prev, ...patch }));
  };

  function save() {
    start(async () => {
      const res = await saveProfile(p);
      if (!res.ok) return setError(res.error);
      setError(null);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="glass mt-6 space-y-8 p-6">
      <section className="space-y-3">
        <h3 className={legend}>About page</h3>
        <label className="block text-sm">
          Headline statement
          <textarea className={`${field} mt-1`} rows={3} value={p.statement} onChange={(e) => edit({ statement: e.target.value })} />
        </label>
        <p className="text-sm">Paragraphs</p>
        <ul className="space-y-2">
          {p.about.map((para, i) => (
            <li key={i} className="flex gap-2">
              <textarea
                className={field}
                rows={4}
                value={para}
                onChange={(e) => edit({ about: p.about.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              <div className="flex flex-col gap-1">
                <button type="button" className={small} aria-label="Move up" disabled={i === 0} onClick={() => edit({ about: moved(p.about, i, -1) })}>↑</button>
                <button type="button" className={small} aria-label="Move down" disabled={i === p.about.length - 1} onClick={() => edit({ about: moved(p.about, i, 1) })}>↓</button>
                <button type="button" className={`${small} text-red-700`} aria-label="Remove paragraph" onClick={() => edit({ about: p.about.filter((_, j) => j !== i) })}>✕</button>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className={small} onClick={() => edit({ about: [...p.about, ""] })}>
          + Add paragraph
        </button>
      </section>

      <section className="space-y-3 border-t border-line pt-6">
        <h3 className={legend}>Facts card (Based in, Focus…)</h3>
        <ul className="space-y-2">
          {p.facts.map((f, i) => (
            <li key={i} className="flex gap-2">
              <input className={`${field} max-w-40`} placeholder="Label" value={f.label} onChange={(e) => edit({ facts: p.facts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <input className={field} placeholder="Value" value={f.value} onChange={(e) => edit({ facts: p.facts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
              <button type="button" className={small} aria-label="Move up" disabled={i === 0} onClick={() => edit({ facts: moved(p.facts, i, -1) })}>↑</button>
              <button type="button" className={`${small} text-red-700`} aria-label="Remove fact" onClick={() => edit({ facts: p.facts.filter((_, j) => j !== i) })}>✕</button>
            </li>
          ))}
        </ul>
        <button type="button" className={small} onClick={() => edit({ facts: [...p.facts, { label: "", value: "" }] })}>
          + Add fact
        </button>
      </section>

      <section className="space-y-3 border-t border-line pt-6">
        <h3 className={legend}>Contact details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Public email (empty hides the email buttons)
            <input className={`${field} mt-1`} type="email" value={p.email} onChange={(e) => edit({ email: e.target.value })} />
          </label>
          <label className="text-sm">
            WhatsApp (country code first, e.g. 2348012345678)
            <input className={`${field} mt-1`} inputMode="tel" value={p.whatsapp} onChange={(e) => edit({ whatsapp: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="space-y-3 border-t border-line pt-6">
        <h3 className={legend}>Socials and links</h3>
        <p className="text-xs text-ink-3">Shown on the Contact page and in the footer. Known names (GitHub, X, Instagram, YouTube…) get their logo.</p>
        <ul className="space-y-2">
          {p.links.map((l, i) => (
            <li key={i} className="flex gap-2">
              <input className={`${field} max-w-36`} placeholder="Name" value={l.label} onChange={(e) => edit({ links: p.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <input className={field} placeholder="https://…" value={l.href} onChange={(e) => edit({ links: p.links.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)) })} />
              <button type="button" className={small} aria-label="Move up" disabled={i === 0} onClick={() => edit({ links: moved(p.links, i, -1) })}>↑</button>
              <button type="button" className={`${small} text-red-700`} aria-label={`Remove ${l.label || "link"}`} onClick={() => edit({ links: p.links.filter((_, j) => j !== i) })}>✕</button>
            </li>
          ))}
        </ul>
        <button type="button" className={small} onClick={() => edit({ links: [...p.links, { label: "", href: "" }] })}>
          + Add link
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-6">
        <button disabled={pending} onClick={save} className="rounded-full bg-ink px-5 py-2 text-sm text-paper disabled:opacity-50">
          {pending ? "Saving…" : "Save profile"}
        </button>
        {saved && <span className="text-sm text-ink-2">Saved. About, Contact and the footer are updated.</span>}
      </div>
      {error && <pre className="text-sm whitespace-pre-wrap text-red-700">{error}</pre>}
    </div>
  );
}
