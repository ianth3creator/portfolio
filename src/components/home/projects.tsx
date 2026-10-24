import Link from "next/link";
import { ProjectStrip } from "@/components/projects/project-strip";
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
        <SectionHead id="projects-title" label="Selected work" title="Some things I've designed and built." />
        {projects.length === 0 ? (
          <p data-reveal className="glass mt-10 p-6 text-[15px] text-ink-2">
            Case studies are on their way. In the meantime, ask me about my work in the chat on the home page.
          </p>
        ) : (
          <>
            <ProjectStrip items={projects.map(toStripItem)} />
            {/* The strip only links the active project; this keeps every case study one link away
                for screen readers and search engines (it replaces the old visible grid). */}
            <nav aria-label="All projects" className="sr-only">
              <ul>
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.slug}`}>
                      {p.title}: {p.summary}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
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
