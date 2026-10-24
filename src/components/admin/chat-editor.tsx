"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveChatFacts } from "@/app/admin/actions";
import type { ChatFact } from "@/lib/types";

const field = "w-full rounded-xl border border-line bg-white/70 px-3 py-2 text-sm outline-none focus:border-accent";
const small = "rounded-full border border-line px-3 py-1 text-xs transition-transform active:scale-[0.97] disabled:opacity-30";

export function ChatEditor({ initial }: { initial: ChatFact[] }) {
  const router = useRouter();
  const [facts, setFacts] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const edit = (next: ChatFact[]) => {
    setSaved(false);
    setFacts(next);
  };

  function save() {
    start(async () => {
      const res = await saveChatFacts({ facts });
      if (!res.ok) return setError(res.error);
      setError(null);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="glass mt-6 space-y-4 p-6">
      <p className="text-sm text-ink-2">
        The &ldquo;Ask me anything&rdquo; chat only answers from what&apos;s on the site plus these facts, so anything you want it to
        know goes here. Write the answer in first person, the way you&apos;d say it. Your projects, About text, skills and
        certifications are already included automatically.
      </p>

      <ul className="space-y-3">
        {facts.map((f, i) => (
          <li key={i} className="space-y-2 rounded-2xl border border-line bg-white/40 p-4">
            <input
              className={field}
              placeholder="Question it answers, e.g. What's your rate?"
              value={f.q}
              onChange={(e) => edit(facts.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
            />
            <textarea
              className={field}
              rows={3}
              placeholder="Your answer, in first person"
              value={f.a}
              onChange={(e) => edit(facts.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
            />
            <div className="flex justify-end">
              <button
                type="button"
                className={`${small} text-red-700`}
                onClick={() => window.confirm("Remove this fact?") && edit(facts.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => edit([...facts, { q: "", a: "" }])}>
          + Add fact
        </button>
        <button disabled={pending} onClick={save} className="rounded-full bg-ink px-5 py-2 text-sm text-paper disabled:opacity-50">
          {pending ? "Saving…" : "Save chat knowledge"}
        </button>
        {saved && <span className="text-sm text-ink-2">Saved. The chat uses it from the next message.</span>}
      </div>
      {error && <pre className="text-sm whitespace-pre-wrap text-red-700">{error}</pre>}
    </div>
  );
}
