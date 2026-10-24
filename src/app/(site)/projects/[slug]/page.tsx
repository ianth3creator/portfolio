import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/home/reveal";
import { BrowserFrame, Media, PhoneFrame } from "@/components/projects/frames";
import { resolveIcon } from "@/lib/icons";
import { platforms, siteLabel } from "@/lib/project-utils";
import { getProject, getProjects } from "@/lib/projects";
import type { Project } from "@/lib/types";

export async function generateStaticParams() {
  const projects = await getProjects();
  // Cache Components needs at least one param at build time; the placeholder renders notFound().
  return projects.length ? projects.map((p) => ({ slug: p.slug })) : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const project = await getProject((await params).slug);
  if (!project) return { title: "Not found" };
  return { title: project.title, description: project.summary };
}

export default function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  return (
    <article className="mx-auto w-full max-w-5xl px-4 pt-8 pb-24 sm:pt-12">
      <Link
        href="/projects"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white/45 px-4 text-[14px] text-ink-2 transition-[transform,color] duration-150 ease-out hover:text-ink active:scale-[0.97]"
      >
        <span aria-hidden>←</span> All projects
      </Link>
      <Suspense fallback={<CaseStudySkeleton />}>
        <CaseStudy params={params} />
      </Suspense>
    </article>
  );
}

const label = "font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase";

async function CaseStudy({ params }: Pick<PageProps<"/projects/[slug]">, "params">) {
  const project = await getProject((await params).slug);
  if (!project) notFound();

  const site = siteLabel(project);
  const details = [
    { label: "Website", value: site, href: project.liveUrl || undefined },
    { label: "Role", value: project.role },
    { label: "Platforms", value: platforms(project).join(" · ") },
    { label: "Stack", value: project.stack.join(", ") },
  ].filter((d) => d.value);
  const hasShots = project.webShots.length > 0 || project.appShots.length > 0;

  const webShots = project.webShots.length > 0 && (
    <section aria-labelledby="web-shots">
      <h2 id="web-shots" className={label}>
        On the web
      </h2>
      <ul className="mt-4 space-y-8">
        {project.webShots.map((a, i) => (
          <li key={a.publicId} data-reveal={i > 0 ? "" : undefined}>
            <figure>
              <BrowserFrame asset={a} site={site} href={project.liveUrl || undefined} priority={i === 0} alt={a.caption ?? `${project.title} on the web`} />
              {a.caption && <figcaption className="mt-3 text-[14px] text-ink-2">{a.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );

  const appShots = project.appShots.length > 0 && (
    <section aria-labelledby="app-shots">
      <h2 id="app-shots" className={label}>
        On mobile
      </h2>
      {/* swipeable row on phones, a grid on larger screens */}
      <ul
        data-lenis-prevent
        className="-mx-4 mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0"
      >
        {project.appShots.map((a) => (
          <li key={a.publicId} className="w-[62vw] max-w-[260px] shrink-0 snap-center md:w-auto md:max-w-none">
            <figure>
              <PhoneFrame asset={a} alt={a.caption ?? `${project.title} app screen`} />
              {a.caption && <figcaption className="mt-3 text-center text-[14px] text-ink-2">{a.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <Reveal>
      <header data-reveal className="mt-10">
        <p className={label}>Case study</p>
        <h1 className="mt-3 text-[clamp(2.2rem,8vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">{project.title}</h1>
        <p className="mt-4 max-w-[56ch] text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">{project.summary}</p>
        <ProjectLinks project={project} site={site} />
      </header>

      {/*
        Screenshots come straight after "what it is", before any long write-up. On phones the
        details card follows them; on desktop it sits in the right column and stays in view.
      */}
      <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_16rem] md:gap-x-10">
        <div className="space-y-12 md:col-start-1 md:row-start-1">
          {/* lead with the platform the project has screenshots for */}
          {project.webShots.length > 0 ? (
            <>
              {webShots}
              {appShots}
            </>
          ) : (
            appShots
          )}
          {!hasShots && project.cover && (
            <div data-glass="panel" className="glass p-2">
              <Media asset={project.cover} alt={project.title} priority sizes="(min-width: 1024px) 720px, 100vw" className="rounded-[16px]" />
            </div>
          )}
        </div>

        {details.length > 0 && (
          <aside className="glass h-fit p-6 md:sticky md:top-28 md:col-start-2 md:row-span-2 md:row-start-1">
            <dl className="space-y-5">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="font-mono text-[11px] tracking-[0.12em] text-ink-3 uppercase">{d.label}</dt>
                  <dd className="mt-1.5 text-[15px] [overflow-wrap:anywhere]">
                    {d.href ? (
                      <a href={d.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                        {d.value} <span aria-hidden>↗</span>
                      </a>
                    ) : (
                      d.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        )}

        <div className="space-y-10 md:col-start-1 md:row-start-2">
          {project.problem && (
            <section data-reveal>
              <h2 className={label}>The problem</h2>
              <p className="mt-3 text-[17px] leading-relaxed whitespace-pre-line text-pretty">{project.problem}</p>
            </section>
          )}
          {project.outcome && (
            <section data-reveal>
              <h2 className={label}>The outcome</h2>
              <p className="mt-3 text-[clamp(1.3rem,4vw,1.6rem)] leading-snug font-semibold tracking-[-0.02em] text-balance">{project.outcome}</p>
            </section>
          )}
          {project.gallery.length > 0 && (
            <section aria-labelledby="more-media">
              <h2 id="more-media" data-reveal className={label}>
                More
              </h2>
              <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {project.gallery.map((a, i) => (
                  <li key={a.publicId} data-reveal className={i % 3 === 0 ? "sm:col-span-2" : undefined}>
                    <figure>
                      <Media asset={a} alt={a.caption ?? ""} sizes={i % 3 === 0 ? "(min-width: 1024px) 720px, 100vw" : "(min-width: 640px) 360px, 100vw"} className="rounded-[16px]" />
                      {a.caption && <figcaption className="mt-3 text-[14px] text-ink-2">{a.caption}</figcaption>}
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function ProjectLinks({ project, site }: { project: Project; site: string | null }) {
  const appStore = resolveIcon("App Store");
  const googlePlay = resolveIcon("Google Play");
  const links = [
    project.liveUrl && { href: project.liveUrl, text: site ? `Visit ${site}` : "Visit site", primary: true, icon: null },
    project.appStoreUrl && { href: project.appStoreUrl, text: "App Store", primary: false, icon: appStore },
    project.playStoreUrl && { href: project.playStoreUrl, text: "Google Play", primary: false, icon: googlePlay },
    project.repoUrl && { href: project.repoUrl, text: "Source", primary: false, icon: resolveIcon("GitHub") },
  ].filter(Boolean) as { href: string; text: string; primary: boolean; icon: { path: string } | null }[];
  if (!links.length) return null;

  return (
    <ul className="mt-7 flex flex-wrap gap-2">
      {links.map((l) => (
        <li key={l.href}>
          <a
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-medium transition-transform duration-150 ease-out active:scale-[0.97] ${
              l.primary ? "bg-ink text-paper" : "border border-line bg-white/50"
            }`}
          >
            {l.icon && (
              <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                <path d={l.icon.path} />
              </svg>
            )}
            {l.text}
            {l.primary && <span aria-hidden>↗</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

function CaseStudySkeleton() {
  return (
    <div aria-hidden className="mt-10 animate-pulse">
      <div className="h-3 w-24 rounded-full bg-ink/8" />
      <div className="mt-4 h-12 w-3/4 rounded-2xl bg-ink/8" />
      <div className="mt-4 h-5 w-2/3 rounded-full bg-ink/6" />
      <div className="mt-10 aspect-[16/10] w-full rounded-[22px] bg-ink/5" />
    </div>
  );
}
