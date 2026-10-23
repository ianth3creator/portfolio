import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { adminDb, firebaseAdminConfigured } from "@/lib/firebase/admin";
import { defaultProfileContent } from "@/lib/profile";
import type { ProfileContent } from "@/lib/types";

export const PROFILE_TAG = "profile";
export const PROFILE_DOC = "site/profile";

/** About and contact content from Firestore (edited in /admin), falling back to lib/profile.ts until the first save. */
export async function getProfileContent(): Promise<ProfileContent> {
  "use cache";
  cacheTag(PROFILE_TAG);
  cacheLife("max");

  if (!firebaseAdminConfigured) return defaultProfileContent;
  const data = (await adminDb().doc(PROFILE_DOC).get()).data() as Partial<ProfileContent> | undefined;
  if (!data) return defaultProfileContent;
  // pick known fields only (the document also carries updatedAt)
  return {
    statement: data.statement ?? defaultProfileContent.statement,
    about: data.about ?? defaultProfileContent.about,
    facts: data.facts ?? defaultProfileContent.facts,
    email: data.email ?? defaultProfileContent.email,
    whatsapp: data.whatsapp ?? defaultProfileContent.whatsapp,
    links: data.links ?? defaultProfileContent.links,
  };
}
