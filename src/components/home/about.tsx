import Image from "next/image";
import { CldImage } from "@/components/ui/cld-image";
import { profile } from "@/lib/profile";
import { getProfileContent } from "@/lib/site-profile";
import type { Certification } from "@/lib/types";
import { Reveal } from "./reveal";
import { SectionHead, sectionClass } from "./section-head";

export async function About() {
  const content = await getProfileContent();
  return (
    <section aria-labelledby="me-title" className={sectionClass}>
      <Reveal className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr] md:gap-14">
        <div>
          <SectionHead id="me-title" label="About" title={content.statement} />
          <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">
            {content.about.map((p) => (
              <p key={p.slice(0, 24)} data-reveal className="max-w-[60ch] text-pretty">
                {p}
              </p>
            ))}
          </div>
        </div>

        <div className="space-y-4 self-end">
          {/* Same photo as the back of the avatar bubble, cropped portrait (public/assets/about-photo.jpg) */}
          <div data-reveal data-glass="panel" className="glass mx-auto max-w-[22rem] p-2 md:max-w-none">
            <Image
              src="/assets/about-photo.jpg"
              alt={`Photo of ${profile.name}`}
              width={960}
              height={1200}
              sizes="(min-width: 768px) 360px, 22rem"
              className="h-auto w-full rounded-[16px]"
            />
          </div>
          <dl data-reveal data-glass="panel" className="glass p-6">
            {content.facts.map((f, i) => (
              <div key={f.label} className={i > 0 ? "mt-5 border-t border-line pt-5" : undefined}>
                <dt className="font-mono text-[11px] tracking-[0.12em] text-ink-3 uppercase">{f.label}</dt>
                <dd className="mt-1.5 text-[16px] font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      {content.certifications.length > 0 && (
        <Reveal className="mt-20 sm:mt-28">
          <div data-reveal>
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Credentials</p>
            <h2 id="certifications" className="mt-3 scroll-mt-28 text-[clamp(1.6rem,5vw,2.2rem)] leading-[1.08] font-semibold tracking-[-0.03em]">
              {content.certificationsTitle}
            </h2>
            {content.certificationsIntro && (
              <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">{content.certificationsIntro}</p>
            )}
          </div>
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {content.certifications.map((c, i) => (
              <li key={`${c.title}-${i}`} data-reveal>
                <CertificationCard cert={c} />
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </section>
  );
}

function CertificationCard({ cert }: { cert: Certification }) {
  const meta = [cert.issuer, cert.date].filter(Boolean).join(" · ");
  return (
    <article className="glass flex h-full flex-col overflow-hidden p-2">
      {cert.image && (
        <div className="overflow-hidden rounded-[16px] bg-paper-2">
          <CldImage
            src={cert.image.publicId}
            width={cert.image.width}
            height={cert.image.height}
            sizes="(min-width: 640px) 480px, 100vw"
            alt={`${cert.title} certificate${cert.issuer ? ` from ${cert.issuer}` : ""}`}
            className="h-auto w-full"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{cert.title}</h3>
        {meta && <p className="mt-1 font-mono text-[11px] tracking-[0.1em] text-ink-3 uppercase">{meta}</p>}
        {cert.description && <p className="mt-3 text-[15px] leading-relaxed text-pretty text-ink-2">{cert.description}</p>}
        {cert.credentialUrl && (
          <a
            href={cert.credentialUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-10 w-fit items-center gap-1.5 rounded-full border border-line bg-white/50 px-4 text-[14px] font-medium transition-[transform,background-color] duration-150 ease-out hover:bg-white/80 active:scale-[0.97]"
          >
            View credential <span aria-hidden>↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
