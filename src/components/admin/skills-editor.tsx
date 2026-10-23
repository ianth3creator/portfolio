"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSkills } from "@/app/admin/actions";
import { iconKey } from "@/lib/icon-key";
import type { SkillGroup } from "@/lib/types";

const field = "w-full rounded-xl border border-line bg-white/70 px-3 py-2 text-sm outline-none focus:border-accent";
const small = "rounded-full border border-line px-3 py-1 text-xs transition-transform active:scale-[0.97] disabled:opacity-30";

export function SkillsEditor({ initial, icons }: { initial: SkillGroup[]; icons: Record<string, string | null> }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const edit = (fn: (draft: SkillGroup[]) => SkillGroup[]) => {
    setSaved(false);
    setGroups((g) => fn(structuredClone(g)));
  };

  function save() {
    start(async () => {
      const res = await saveSkills({ groups });
      if (!res.ok) return setError(res.error);
      setError(null);
      setSaved(true);
      router.refresh(); // re-resolves the logo previews
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-ink-2">
        Logos are matched by name (Python, Next.js, Docker…). If one doesn&apos;t show after saving, put its slug from{" "}
        <a href="https://simpleicons.org" target="_blank" rel="noreferrer" className="underline underline-offset-4">
          simpleicons.org
        </a>{" "}
        in the logo field. Concepts like &ldquo;System design&rdquo; simply have no logo.
      </p>

      {groups.map((g, gi) => (
        <div key={gi} className="glass space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <input className={field} value={g.title} placeholder="Group title" onChange={(e) => edit((d) => ((d[gi].title = e.target.value), d))} />
            <input className={field} value={g.note} placeholder="One-line note" onChange={(e) => edit((d) => ((d[gi].note = e.target.value), d))} />
            <div className="flex items-center gap-1">
              <button type="button" className={small} aria-label="Move group up" disabled={gi === 0} onClick={() => edit((d) => (d.splice(gi - 1, 0, ...d.splice(gi, 1)), d))}>↑</button>
              <button type="button" className={small} aria-label="Move group down" disabled={gi === groups.length - 1} onClick={() => edit((d) => (d.splice(gi + 1, 0, ...d.splice(gi, 1)), d))}>↓</button>
              <button type="button" className={`${small} text-red-700`} onClick={() => window.confirm(`Remove “${g.title}”?`) && edit((d) => (d.splice(gi, 1), d))}>Remove</button>
            </div>
          </div>

          <ul className="space-y-2">
            {g.items.map((item, ii) => {
              const path = icons[iconKey(item.name, item.icon)];
              return (
                <li key={ii} className="flex items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-white/60" title={path ? "Logo found" : "No logo"}>
                    {path ? (
                      <svg viewBox="0 0 24 24" className="size-4 fill-ink-2" aria-hidden><path d={path} /></svg>
                    ) : (
                      <span className="text-[10px] text-ink-3">—</span>
                    )}
                  </span>
                  <input className={field} value={item.name} placeholder="Skill" onChange={(e) => edit((d) => ((d[gi].items[ii].name = e.target.value), d))} />
                  <input className={`${field} max-w-36`} value={item.icon ?? ""} placeholder="logo slug" onChange={(e) => edit((d) => ((d[gi].items[ii].icon = e.target.value || undefined), d))} />
                  <button type="button" className={small} aria-label="Move up" disabled={ii === 0} onClick={() => edit((d) => (d[gi].items.splice(ii - 1, 0, ...d[gi].items.splice(ii, 1)), d))}>↑</button>
                  <button type="button" className={`${small} text-red-700`} aria-label={`Remove ${item.name}`} onClick={() => edit((d) => (d[gi].items.splice(ii, 1), d))}>✕</button>
                </li>
              );
            })}
          </ul>
          <button type="button" className={small} onClick={() => edit((d) => (d[gi].items.push({ name: "" }), d))}>
            + Add skill
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => edit((d) => [...d, { title: "", note: "", items: [] }])}>
          + Add group
        </button>
        <button disabled={pending} onClick={save} className="rounded-full bg-ink px-5 py-2 text-sm text-paper disabled:opacity-50">
          {pending ? "Saving…" : "Save skills"}
        </button>
        {saved && <span className="text-sm text-ink-2">Saved. The skills page is updated.</span>}
      </div>
      {error && <pre className="text-sm whitespace-pre-wrap text-red-700">{error}</pre>}
    </div>
  );
}
