import { profile } from "@/lib/profile";

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-4 pb-10 font-mono text-[11px] tracking-[0.12em] text-ink-3 uppercase">
      <span>{profile.name} · The Software Engineer</span>
      <ul className="flex gap-5">
        {profile.links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
