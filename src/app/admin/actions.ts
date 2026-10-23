"use server";

import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { isAdminEmail, requireAdmin, SESSION_COOKIE } from "@/lib/auth";
import { PROJECTS_TAG } from "@/lib/projects";
import { SKILLS_DOC, SKILLS_TAG } from "@/lib/skills";

const FIVE_DAYS = 60 * 60 * 24 * 5 * 1000;

export async function createSession(idToken: string) {
  const decoded = await adminAuth().verifyIdToken(idToken, true);
  if (!isAdminEmail(decoded.email)) return { ok: false as const, error: "This account isn't allowed in." };
  const session = await adminAuth().createSessionCookie(idToken, { expiresIn: FIVE_DAYS });
  (await cookies()).set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FIVE_DAYS / 1000,
  });
  return { ok: true as const };
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
}

const asset = z.object({
  publicId: z.string().min(1),
  width: z.number(),
  height: z.number(),
  resourceType: z.enum(["image", "video"]),
  caption: z.string().max(80).optional(),
});

const optionalUrl = z.url().optional().or(z.literal(""));

const projectSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes"),
  title: z.string().min(1),
  summary: z.string().min(1).max(160),
  problem: z.string().default(""),
  role: z.string().default(""),
  stack: z.array(z.string()).default([]),
  outcome: z.string().default(""),
  liveUrl: optionalUrl,
  siteName: z.string().max(60).default(""),
  appStoreUrl: optionalUrl,
  playStoreUrl: optionalUrl,
  repoUrl: optionalUrl,
  cover: asset.optional(),
  webShots: z.array(asset).default([]),
  appShots: z.array(asset).default([]),
  gallery: z.array(asset).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  order: z.number().default(100),
});

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveProject(id: string | null, input: unknown): Promise<SaveResult> {
  await requireAdmin();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: z.prettifyError(parsed.error) };

  const data = Object.fromEntries(
    Object.entries({ ...parsed.data, updatedAt: Date.now() }).filter(([, v]) => v !== undefined),
  );
  const col = adminDb().collection("projects");
  const ref = id ? col.doc(id) : col.doc();
  await ref.set(data, { merge: false });

  updateTag(PROJECTS_TAG); // the public site shows the change on the next request
  return { ok: true, id: ref.id };
}

export async function deleteProject(id: string) {
  await requireAdmin();
  await adminDb().collection("projects").doc(id).delete();
  updateTag(PROJECTS_TAG);
}

const skillsSchema = z.object({
  groups: z
    .array(
      z.object({
        title: z.string().trim().min(1, "Every group needs a title"),
        note: z.string().trim().default(""),
        items: z
          .array(z.object({ name: z.string().trim().min(1), icon: z.string().trim().optional() }))
          .default([]),
      }),
    )
    .max(8),
});

export async function saveSkills(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = skillsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: z.prettifyError(parsed.error) };
  // Firestore rejects undefined, so drop empty icon slugs
  const groups = parsed.data.groups.map((g) => ({
    ...g,
    items: g.items.map(({ name, icon }) => (icon ? { name, icon } : { name })),
  }));
  await adminDb().doc(SKILLS_DOC).set({ groups, updatedAt: Date.now() });
  updateTag(SKILLS_TAG);
  return { ok: true };
}
