import { getCldVideoUrl } from "next-cloudinary";
import { CldImage } from "@/components/ui/cld-image";
import type { CloudinaryAsset } from "@/lib/types";

/** A screenshot or video from Cloudinary at its natural aspect ratio. */
export function Media({ asset, alt, sizes, priority, className }: { asset: CloudinaryAsset; alt: string; sizes: string; priority?: boolean; className?: string }) {
  if (asset.resourceType === "video") {
    return (
      <video
        src={getCldVideoUrl({ src: asset.publicId, width: Math.min(asset.width, 1280) })}
        width={asset.width}
        height={asset.height}
        controls
        playsInline
        muted
        preload="metadata"
        className={`h-auto w-full bg-paper-2 ${className ?? ""}`}
      />
    );
  }
  return <CldImage src={asset.publicId} width={asset.width} height={asset.height} sizes={sizes} alt={alt} priority={priority} className={`h-auto w-full ${className ?? ""}`} />;
}

/** Minimal browser window: traffic-light dots and an address pill with the site name. */
export function BrowserFrame({ asset, site, href, alt }: { asset: CloudinaryAsset; site: string | null; href?: string; alt: string }) {
  const pill = (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-white/70 px-3 py-1 font-mono text-[11px] text-ink-2">
      <svg viewBox="0 0 24 24" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      {site ?? "preview"}
    </span>
  );
  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-white/50 shadow-[0_18px_40px_-24px_oklch(0.3_0.03_60/0.35)]">
      <div className="grid h-10 grid-cols-[3.5rem_1fr_3.5rem] items-center border-b border-line bg-white/60 px-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-ink/12" />
          <span className="size-2.5 rounded-full bg-ink/12" />
          <span className="size-2.5 rounded-full bg-ink/12" />
        </span>
        <span className="flex min-w-0 justify-center">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="min-w-0 transition-opacity hover:opacity-70">
              {pill}
            </a>
          ) : (
            pill
          )}
        </span>
      </div>
      <Media asset={asset} alt={alt} sizes="(min-width: 896px) 880px, 100vw" />
    </div>
  );
}

/** Phone bezel with a dynamic-island notch; the screenshot keeps its own aspect ratio. */
export function PhoneFrame({ asset, alt }: { asset: CloudinaryAsset; alt: string }) {
  return (
    <div className="relative rounded-[2.4rem] bg-ink p-[7px] shadow-[0_24px_40px_-22px_oklch(0.2_0.02_60/0.55)]">
      <span aria-hidden className="absolute top-[14px] left-1/2 z-10 h-[18px] w-[30%] -translate-x-1/2 rounded-full bg-ink" />
      <Media asset={asset} alt={alt} sizes="(min-width: 768px) 260px, 62vw" className="rounded-[2rem]" />
    </div>
  );
}
