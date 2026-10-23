"use client";

import { useState } from "react";

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-12 items-center rounded-full border border-line bg-white/50 px-6 text-[15px] font-medium transition-[transform,background-color] duration-150 ease-out hover:bg-white/80 active:scale-[0.97]"
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy email"}</span>
    </button>
  );
}
