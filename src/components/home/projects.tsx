import Link from "next/link";
import { CldImage } from "@/components/ui/cld-image";
import { platforms, wideImage } from "@/lib/project-utils";
import { getProjects } from "@/lib/projects";
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
          <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                      <p className="mt-4 font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase">
                        {[...platforms(p), ...p.stack.slice(0, 3)].join(" · ")}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </section>
  );
}

/** Cover or first web screenshot; for app-only projects, up to three phone screens side by side. */
function CardMedia({ project, wide }: { project: Project; wide: boolean }) {
  const image = wideImage(project);
  if (image) {
    return (
      <div className="overflow-hidden rounded-[16px]">
        <CldImage
          src={image.publicId}
          width={image.width}
          height={image.height}
          crop="fill"
          gravity="north"
          sizes={wide ? "(min-width: 1024px) 1000px, 100vw" : "(min-width: 640px) 50vw, 100vw"}
          alt=""
          className="aspect-[16/10] w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      </div>
    );
  }
  const phones = project.appShots.filter((a) => a.resourceType === "image").slice(0, 3);
  if (!phones.length) return null;
  return (
    <div className="flex aspect-[16/10] items-end justify-center gap-[4%] overflow-hidden rounded-[16px] bg-paper-2 px-[8%] pt-[6%]">
      {phones.map((a, i) => (
        <CldImage
          key={a.publicId}
          src={a.publicId}
          width={a.width}
          height={a.height}
          sizes="(min-width: 640px) 15vw, 30vw"
          alt=""
          className={`w-[28%] rounded-t-[14px] shadow-[0_10px_24px_-14px_oklch(0.2_0.02_60/0.5)] transition-transform duration-500 ease-out ${
            i === 1 ? "-translate-y-[6%] group-hover:-translate-y-[9%]" : "group-hover:-translate-y-[2%]"
          }`}
        />
      ))}
    </div>
  );
}
