"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { AvatarOrb } from "@/components/avatar/avatar-orb";
import { ChatBox } from "@/components/chat/chat-box";
import { NAV } from "@/lib/nav";

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-in]", {
        y: 14,
        opacity: 0,
        filter: "blur(6px)",
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.06,
        // a leftover inline filter flattens 3D and breaks the avatar flip
        clearProps: "filter,transform,opacity",
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-7 px-4 pt-10 pb-10 text-center">
      <div data-in className="w-full">
        {/* Drop your photo at public/assets/avatar/photo.jpg — the placeholder shows until it exists. */}
        <AvatarOrb
          videoSrc="/assets/avatar/avatar-stacked.mp4"
          posterSrc="/assets/avatar/avatar-poster.webp"
          photoSrc="/assets/avatar/photo.jpg"
        />
      </div>

      <div>
        <p data-in className="text-[17px] text-ink-2">Hi, I&apos;m Ian</p>
        <h1 data-in className="mt-1 text-[clamp(2.4rem,9vw,4rem)] leading-[1.02] font-semibold tracking-[-0.035em]">
          The Software Engineer.
        </h1>
        <p data-in className="mt-3 font-mono text-[12px] tracking-wide text-ink-3 uppercase">
          Senior engineer · Software architect · AI engineer
        </p>
      </div>

      <div data-in className="w-full">
        <ChatBox />
      </div>

      <nav data-in aria-label="Sections" className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            data-glass="panel"
            className="glass py-4 text-sm font-medium transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.97]"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
