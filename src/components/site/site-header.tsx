"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";

/** Glass bar on every page except home (the hero has its own navigation tiles). */
export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <header className="sticky top-3 z-10 mx-auto w-full max-w-5xl px-4 pt-3">
      {/*
        No data-glass here: the WebGL glass sits behind the page, so it can't blur text
        scrolling under a sticky bar. The CSS frosted blur can, with a stronger fill.
      */}
      <nav
        aria-label="Main"
        className="glass flex items-center justify-between gap-2 rounded-full! bg-(--glass-fill-strong)! py-1.5 pr-1.5 pl-4"
      >
        {/* Home: a still of the avatar's head (public/assets/avatar/avatar-head.webp) */}
        <Link
          href="/"
          aria-label="Ian, home"
          className="-ml-2.5 grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-paper-2 ring-1 ring-line transition-transform duration-150 ease-out active:scale-[0.94]"
        >
          <Image src="/assets/avatar/avatar-head.webp" alt="" width={40} height={40} className="size-10" priority />
        </Link>
        <ul className="flex items-center">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-10 items-center rounded-full px-3 text-[14px] transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                    active ? "bg-white/75 font-medium text-ink shadow-[0_1px_2px_oklch(0.3_0.03_60/0.08)]" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
