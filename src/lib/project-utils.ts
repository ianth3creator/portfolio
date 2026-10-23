import type { CloudinaryAsset, Project } from "@/lib/types";

/** "fluxpay.app": the admin's website name, else the live URL's host without www. */
export function siteLabel(p: Pick<Project, "siteName" | "liveUrl">): string | null {
  if (p.siteName?.trim()) return p.siteName.trim();
  if (!p.liveUrl) return null;
  try {
    return new URL(p.liveUrl).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Which platforms a project ships on, from its links and screenshots. */
export function platforms(p: Project): string[] {
  const out: string[] = [];
  if (p.liveUrl || p.webShots.length) out.push("Web");
  if (p.appStoreUrl) out.push("iOS");
  if (p.playStoreUrl) out.push("Android");
  if (!p.appStoreUrl && !p.playStoreUrl && p.appShots.length) out.push("Mobile");
  return out;
}

/** The wide image for cards: the cover, else the first web screenshot. */
export function wideImage(p: Project): CloudinaryAsset | undefined {
  return p.cover ?? p.webShots.find((a) => a.resourceType === "image");
}
