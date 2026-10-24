import Link from "next/link";
import { ProjectStrip } from "@/components/projects/project-strip";
import { CardMedia } from "@/components/projects/card-media";
import { platforms, wideImage } from "@/lib/project-utils";
import { getProjects } from "@/lib/projects";
import type { StripItem } from "@/lib/strip-store";
import type { Project } from "@/lib/types";
import { Reveal } from "./reveal";
import { SectionHead, sectionClass } from "./section-head";

export async function Projects() {
  const projects = await getProjects();
  return (
    <section aria-labelledby="projects-title" className={sectionClass}>
      <Reveal>
        <SectionHead id="projects-title" label="Selected work" title="Things I've designed and built." />
        {projects.length === 0 ? (
          <p data-reveal className="glass mt-10 p-6 text-[15px] text-ink-2">
            Case studies are on their way. In the meantime, ask me about my work in the chat on the home page.
          </p>
        ) : (
          <>
            <ProjectStrip items={projects.map(toStripItem)} />
            <h2 data-reveal className="mt-20 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">
              All projects
            </h2>
          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {projects.map((p, i) => (
              <li key={p.id} data-reveal className={p.featured && i === 0 ? "sm:col-span-2" : undefined}>
                <Link
                  href={`/projects/${p.slug}`}
                  data-glass="panel"
                  className="glass group block h-full overflow-hidden p-2 transition-transform duration-200 ease-out active:scale-[0.985]"
                >
                  <CardMedia project={p} wide={p.featured && i === 0} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-[18px] font-semibold tracking-[-0.01em]">{p.title}</h2>
                      <span aria-hidden className="mt-0.5 text-ink-3 transition-transform duration-200 ease-out group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>
                    <p className="mt-1 text-[15px] text-ink-2">{p.summary}</p>
                    {p.outcome && <p className="mt-3 text-[15px] font-medium">{p.outcome}</p>}
                    {(platforms(p).length > 0 || p.stack.length > 0) && (
                      <p className="mt-4 font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase [overflow-wrap:anywhere]">
                        {[...platforms(p), ...p.stack.slice(0, 3)].join(" · ")}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          </>
        )}
      </Reveal>
    </section>
  );
}

/** Plain, serialisable data for the strip (the client only needs images and names). */
function toStripItem(p: Project): StripItem {
  const image = wideImage(p);
  const pick = (a: { publicId: string; width: number; height: number }) => ({ publicId: a.publicId, width: a.width, height: a.height });
  const phones = p.appShots.filter((a) => a.resourceType === "image").slice(0, 3);
  return {
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    outcome: p.outcome,
    // a tag line, not a paragraph: shorten anything long that was typed into the stack field
    tags: [...platforms(p), ...p.stack.slice(0, 3).map((t) => (t.length > 32 ? `${t.slice(0, 31).trim()}…` : t))],
    image: image ? pick(image) : undefined,
    phones: phones.map(pick),
    media: { cover: p.cover, webShots: image && !p.cover ? [image] : [], appShots: phones },
  };
}
