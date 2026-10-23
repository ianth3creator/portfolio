import { GlassLayer } from "@/components/glass/glass-layer";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Public pages share one WebGL glass canvas that stays mounted across navigations
 * (no reload of the fluid or glass between pages); /admin stays outside this group.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <GlassLayer />
      <div className="relative z-[2] flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </>
  );
}
