"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

const input =
  "mt-1.5 w-full rounded-2xl border border-line bg-white/60 px-4 text-[16px] outline-none transition-[border-color,background-color] duration-150 placeholder:text-ink-3 focus:border-accent focus:bg-white/80";

/**
 * Sends to Web3Forms from the browser (their free plan expects browser submissions),
 * which emails the message to the Web3Forms account.
 */
export function ContactForm({ accessKey }: { accessKey: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("botcheck")) return; // honeypot: real people never fill it
    setStatus("sending");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Portfolio message from ${data.get("name")}`,
          from_name: "Portfolio contact form",
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message);
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="mt-8 rounded-2xl border border-line bg-white/55 p-6">
        <p className="text-[17px] font-medium">Thanks, your message is on its way.</p>
        <p className="mt-1 text-[15px] text-ink-2">I&apos;ll get back to you within a day.</p>
        <button type="button" onClick={() => setStatus("idle")} className="mt-4 text-[14px] text-ink-2 underline underline-offset-4 hover:text-ink">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="text-[14px] text-ink-2">
        Name
        <input name="name" required autoComplete="name" className={`${input} h-12`} />
      </label>
      <label className="text-[14px] text-ink-2">
        Email
        <input name="email" type="email" required autoComplete="email" className={`${input} h-12`} />
      </label>
      <label className="text-[14px] text-ink-2 sm:col-span-2">
        What are you working on?
        <textarea name="message" required rows={5} className={`${input} resize-y py-3`} />
      </label>
      {/* honeypot, hidden from people and screen readers */}
      <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-paper transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        {status === "error" && (
          <p role="alert" className="text-[14px] text-red-700">
            That didn&apos;t send. Please try again, or use WhatsApp or email below.
          </p>
        )}
      </div>
    </form>
  );
}
