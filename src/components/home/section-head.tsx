/** Page title block: each section is its own page, so the title is the page's h1. */
export function SectionHead({ label, title, id }: { label: string; title: React.ReactNode; id?: string }) {
  return (
    <div data-reveal>
      <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">{label}</p>
      <h1 id={id} className="mt-3 max-w-[22ch] text-[clamp(1.9rem,6.4vw,3rem)] leading-[1.04] font-semibold tracking-[-0.032em] text-balance">
        {title}
      </h1>
    </div>
  );
}

/** Shared outer shell for the section pages (the header sits above, so the top padding is light). */
export const sectionClass = "mx-auto w-full max-w-5xl px-4 pt-10 pb-20 sm:pt-16 sm:pb-28";
