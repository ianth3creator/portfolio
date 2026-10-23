import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { adminDb, firebaseAdminConfigured } from "@/lib/firebase/admin";
import { defaultSkills } from "@/lib/profile";
import type { SkillGroup } from "@/lib/types";

export const SKILLS_TAG = "skills";
export const SKILLS_DOC = "site/skills";

/** Skill groups from Firestore (edited in /admin), falling back to lib/profile.ts until the first save. */
export async function getSkills(): Promise<SkillGroup[]> {
  "use cache";
  cacheTag(SKILLS_TAG);
  cacheLife("max");

  if (!firebaseAdminConfigured) return defaultSkills;
  const snap = await adminDb().doc(SKILLS_DOC).get();
  const groups = snap.data()?.groups as SkillGroup[] | undefined;
  return groups?.length ? groups : defaultSkills;
}
