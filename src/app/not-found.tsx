import Link from "next/link";
import { GlassLayer } from "@/components/glass/glass-layer";

export default function NotFound() {
  return (
    <>
      <GlassLayer />
      <main className="relative z-[2] mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 text-center">
        <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">404</p>
        <h1 className="mt-3 text-[clamp(2rem,8vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
          This page doesn&apos;t exist.
        </h1>
        <p className="mt-3 text-[16px] text-ink-2">It may have moved, or the link has a typo.</p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-paper transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Back home
        </Link>
      </main>
    </>
  );
}
