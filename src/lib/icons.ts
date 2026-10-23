import "server-only";
import * as simpleIcons from "simple-icons";

/**
 * Tech logos from Simple Icons (CC0), resolved on the server so only the
 * SVG paths actually used end up in the HTML.
 */
export type TechIcon = { title: string; path: string };

type SimpleIcon = { title: string; slug: string; path: string };

// Names people write that differ from Simple Icons' titles
const ALIASES: Record<string, string> = {
  "react native": "react",
  node: "nodedotjs",
  postgres: "postgresql",
  nextjs: "nextdotjs",
  "next": "nextdotjs",
  gcp: "googlecloud",
  "google cloud platform": "googlecloud",
  tailwind: "tailwindcss",
  aws: "amazonwebservices",
};

let index: { bySlug: Map<string, SimpleIcon>; byTitle: Map<string, SimpleIcon> } | null = null;

function lookup() {
  if (!index) {
    const all = Object.values(simpleIcons as unknown as Record<string, SimpleIcon>).filter((i) => i && typeof i.path === "string");
    index = {
      bySlug: new Map(all.map((i) => [i.slug, i])),
      byTitle: new Map(all.map((i) => [i.title.toLowerCase(), i])),
    };
  }
  return index;
}

/** Finds a logo by explicit slug, then by name, then by alias. Null for concepts like "System design". */
export function resolveIcon(name: string, slug?: string): TechIcon | null {
  const { bySlug, byTitle } = lookup();
  const key = name.trim().toLowerCase();
  const hit =
    (slug && bySlug.get(slug.trim().toLowerCase())) ||
    byTitle.get(key) ||
    (ALIASES[key] && bySlug.get(ALIASES[key])) ||
    null;
  return hit ? { title: hit.title, path: hit.path } : null;
}
