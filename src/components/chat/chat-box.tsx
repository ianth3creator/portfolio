"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["What do you build?", "What's your stack?", "Can I hire you?"];

export function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? "Something went wrong — try again?" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn't reach the server — try again in a moment." }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }));
    }
  }

  return (
    <div className="w-full">
      {messages.length > 0 && (
        <div
          ref={listRef}
          data-lenis-prevent
          aria-live="polite"
          data-glass="panel"
          className="glass mb-3 max-h-72 space-y-3 overflow-y-auto p-4 text-[15px] leading-relaxed"
        >
          {messages.map((m, i) => (
            <p key={i} className={m.role === "user" ? "text-right text-ink-2" : "text-ink"}>
              {m.content}
            </p>
          ))}
          {busy && <p className="text-ink-3">Thinking…</p>}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        data-glass="panel"
        className="glass flex items-center gap-2 rounded-full! py-1.5 pr-1.5 pl-5"
      >
        <label htmlFor="ask" className="sr-only">Ask me anything</label>
        <input
          id="ask"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-ink-3"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white transition-transform duration-150 ease-out active:scale-[0.94] disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>

      {messages.length === 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-line bg-white/40 px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:bg-white/70">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
