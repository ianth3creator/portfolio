import Image from "next/image";
import { profile } from "@/lib/profile";
import { Reveal } from "./reveal";
import { SectionHead, sectionClass } from "./section-head";

export function About() {
  return (
    <section aria-labelledby="me-title" className={sectionClass}>
      <Reveal className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:gap-14">
        <div>
          <SectionHead id="me-title" label="About" title={profile.statement} />
          <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">
            {profile.about.map((p) => (
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
            {profile.facts.map((f, i) => (
              <div key={f.label} className={i > 0 ? "mt-5 border-t border-line pt-5" : undefined}>
                <dt className="font-mono text-[11px] tracking-[0.12em] text-ink-3 uppercase">{f.label}</dt>
                <dd className="mt-1.5 text-[16px] font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </section>
  );
}
