import { resolveIcon } from "@/lib/icons";
import { profile } from "@/lib/profile";
import { getProfileContent } from "@/lib/site-profile";
import { ContactForm } from "./contact-form";
import { CopyEmail } from "./copy-email";
import { Reveal } from "./reveal";
import { SectionHead, sectionClass } from "./section-head";

const secondary =
  "inline-flex h-12 items-center gap-2 rounded-full border border-line bg-white/50 px-5 text-[15px] font-medium transition-[transform,background-color] duration-150 ease-out hover:bg-white/80 active:scale-[0.97]";

export async function Contact() {
  const content = await getProfileContent();
  // Empty details don't render, so nothing broken goes live.
  const email = content.email.trim() || null;
  const whatsapp = content.whatsapp.replace(/\D/g, "");
  const whatsappIcon = resolveIcon("WhatsApp");
  const links = content.links.filter((l) => l.href.trim());

  return (
    <section aria-labelledby="contact-title" className={sectionClass}>
      <Reveal>
        <div data-glass="panel" className="glass px-6 py-10 sm:px-12 sm:py-14">
          <SectionHead id="contact-title" label="Contact" title="Have something in mind? Let's build it." />
          <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">
            Tell me what you&apos;re working on and where you&apos;re stuck. I usually reply within a day.
          </p>

          <ContactForm accessKey={profile.contactFormKey} />

          {(whatsapp || email) && (
            <div className="mt-10 border-t border-line pt-6">
              <p className="font-mono text-[11px] tracking-[0.12em] text-ink-3 uppercase">Or reach me directly</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hi Ian, I found you through your portfolio.")}`}
                    target="_blank"
                    rel="noreferrer"
                    className={secondary}
                  >
                    {whatsappIcon && (
                      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                        <path d={whatsappIcon.path} />
                      </svg>
                    )}
                    WhatsApp
                  </a>
                )}
                {email && (
                  <>
                    <a href={`mailto:${email}`} className={secondary}>
                      Email me
                    </a>
                    <CopyEmail email={email} />
                  </>
                )}
              </div>
            </div>
          )}

          {links.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline">
                    <SocialIcon label={l.label} />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>
    </section>
  );
}

/** Logo for a social link when Simple Icons has one (GitHub, X, Instagram…); nothing otherwise. */
export function SocialIcon({ label }: { label: string }) {
  const icon = resolveIcon(label);
  if (!icon) return null;
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-current" aria-hidden>
      <path d={icon.path} />
    </svg>
  );
}
