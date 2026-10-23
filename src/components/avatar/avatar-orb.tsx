"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { StackedAlphaVideo, type StackedAlphaHandle } from "./stacked-alpha-video";

gsap.registerPlugin(useGSAP);

type Props = {
  /** stacked-alpha MP4 (colour on top, mask below) */
  videoSrc: string;
  /** transparent PNG/WebP of a single avatar frame */
  posterSrc: string;
  /** your real photo, shown on the back */
  photoSrc: string;
  photoAlt?: string;
};

// `mask` shorthand, not `mask-image`: the position/size of the first layer is only valid there
const AVATAR_MASK =
  "linear-gradient(#000,#000) top / 100% 58.33% no-repeat, radial-gradient(ellipse 41.67% 41.67% at 50% 58.33%, #000 99.2%, transparent 100%)";

// Safari still needs the prefixed property for the flip
const HIDDEN_BACKFACE = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" } as const;

/** Shown until the real photo file exists. */
const PHOTO_FALLBACK = "/assets/avatar/photo-placeholder.svg";

/**
 * Front: animated avatar sitting in a glass bubble, head breaking out of the top.
 * Back: real photo. Tap / Enter / Space flips it.
 */
export function AvatarOrb({ videoSrc, posterSrc, photoSrc, photoAlt = "Photo of Ian" }: Props) {
  const scope = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const video = useRef<StackedAlphaHandle>(null);
  const [flipped, setFlipped] = useState(false);
  const [photo, setPhoto] = useState(photoSrc);
  const reduced = useReducedMotion();

  // kill any running flip tween on unmount
  useGSAP(() => () => gsap.killTweensOf(card.current), { scope });

  function toggle() {
    const next = !flipped;
    setFlipped(next);
    if (next) video.current?.pause();
    else video.current?.play();

    if (reduced) {
      gsap.set(card.current, { rotateY: next ? 180 : 0 });
      return;
    }
    gsap.to(card.current, {
      rotateY: next ? 180 : 0,
      duration: 0.9,
      ease: "elastic.out(1, 0.75)",
      overwrite: true,
    });
    // small squash on press, like a soft bubble
    gsap.fromTo(
      card.current,
      { scale: 0.96 },
      { scale: 1, duration: 0.6, ease: "elastic.out(1.1, 0.5)" },
    );
  }

  return (
    // top padding reserves the space the head breaks out into
    <div
      ref={scope}
      className="relative mx-auto w-(--orb) pt-[calc(var(--orb)*0.16)]"
      style={{ perspective: 1000, "--orb": "min(64vw,260px)" } as React.CSSProperties}
    >
      <button
        type="button"
        data-glass="orb"
        onClick={toggle}
        aria-pressed={flipped}
        aria-label={flipped ? "Show avatar" : "Show my photo"}
        className="block w-full cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
      >
        <div
          ref={card}
          className="relative aspect-square w-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* FRONT */}
          <div className="absolute inset-0" style={HIDDEN_BACKFACE}>
            <div className="glass absolute inset-0 rounded-full" />
            {/*
              The clip is a head-and-shoulders crop filling the frame, so the avatar box is
              120% of the bubble (square, bottom-aligned, centred): the head rises ~15% above the rim.
              Mask: everything above the bubble's centre line shows (head breaks out),
              below it only what's inside the circle (shoulders tuck into the glass).
              In box coordinates the bubble centre is at (20+50)/120 = 58.33% and its radius 50/120 = 41.67%.
            */}
            <div
              className="absolute -inset-x-[10%] bottom-0 aspect-square"
              style={{ mask: AVATAR_MASK, WebkitMask: AVATAR_MASK }}
            >
              {/* the face sits ~8% right of centre in the source clip */}
              <StackedAlphaVideo
                ref={video}
                src={videoSrc}
                poster={posterSrc}
                still={reduced}
                startAt={5}
                className="absolute bottom-0 -left-[8%] aspect-square w-full"
              />
            </div>
            {/* front sheen over the lower half, so the shoulders read as inside the glass */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(to bottom, transparent 58%, oklch(1 0 0 / 0.22) 100%)",
                boxShadow: "inset 0 -2px 3px -1px oklch(1 0 0 / 0.7), inset 0 -18px 30px -22px oklch(1 0 0 / 0.9)",
              }}
            />
          </div>

          {/* BACK */}
          <div
            className="glass absolute inset-0 overflow-hidden rounded-full p-1.5"
            style={{ ...HIDDEN_BACKFACE, transform: "rotateY(180deg)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={photoAlt}
              draggable={false}
              onError={() => setPhoto(PHOTO_FALLBACK)}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        </div>
      </button>
    </div>
  );
}
