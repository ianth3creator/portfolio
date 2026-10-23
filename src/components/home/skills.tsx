import { resolveIcon } from "@/lib/icons";
import { getSkills } from "@/lib/skills";
import { Reveal } from "./reveal";
import { SectionHead, sectionClass } from "./section-head";

export async function Skills() {
  const groups = await getSkills();
  return (
    <section aria-labelledby="skills-title" className={sectionClass}>
      <Reveal>
        <SectionHead id="skills-title" label="Skills" title="What I bring to a team." />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {groups.map((g) => (
            <li key={g.title} data-reveal data-glass="panel" className="glass p-6">
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{g.title}</h2>
              {g.note && <p className="mt-1 text-[15px] text-ink-2">{g.note}</p>}
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {g.items.map((item) => {
                  const icon = resolveIcon(item.name, item.icon);
                  return (
                    <li
                      key={item.name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/45 px-2.5 py-1 text-[13px] text-ink-2"
                    >
                      {icon && (
                        <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 fill-current text-ink" aria-hidden>
                          <path d={icon.path} />
                        </svg>
                      )}
                      {item.name}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
