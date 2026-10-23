import { profile } from "@/lib/profile";
import { getProfileContent } from "@/lib/site-profile";

export async function SiteFooter() {
  const { links } = await getProfileContent();
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-4 pb-10 font-mono text-[11px] tracking-[0.12em] text-ink-3 uppercase">
      <span>{profile.name} · The Software Engineer</span>
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
