import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { adminDb, firebaseAdminConfigured } from "@/lib/firebase/admin";
import type { Project } from "@/lib/types";

export const PROJECTS_TAG = "projects";

/** Fills fields added after a project was first saved, so older documents still render. */
const DEFAULTS = {
  stack: [],
  webShots: [],
  appShots: [],
  gallery: [],
  problem: "",
  role: "",
  outcome: "",
  featured: false,
  published: false,
  order: 100,
  updatedAt: 0,
} satisfies Partial<Project>;

function toProject(id: string, data: FirebaseFirestore.DocumentData): Project {
  return { ...DEFAULTS, ...(data as Omit<Project, "id">), id };
}

/**
 * Published projects, cached until the admin saves something (updateTag(PROJECTS_TAG)).
 * No rebuild or git push needed to add a project.
 */
export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheTag(PROJECTS_TAG);
  cacheLife("max");

  if (!firebaseAdminConfigured) return [];
  // Filter in code rather than where()+orderBy(), so no composite index is needed.
  const snap = await adminDb().collection("projects").orderBy("order", "asc").get();
  return snap.docs
    .map((d) => toProject(d.id, d.data()))
    .filter((p) => p.published);
}

/** One published project by slug (reads the cached list, so it shares its tag). */
export async function getProject(slug: string): Promise<Project | null> {
  return (await getProjects()).find((p) => p.slug === slug) ?? null;
}

/** Everything, including drafts — admin only. Not cached. */
export async function getAllProjectsForAdmin(): Promise<Project[]> {
  if (!firebaseAdminConfigured) return [];
  const snap = await adminDb().collection("projects").orderBy("order", "asc").get();
  return snap.docs.map((d) => toProject(d.id, d.data()));
}
