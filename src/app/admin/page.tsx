import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdmin } from "@/lib/auth";
import { resolveIcon } from "@/lib/icons";
import { getAllProjectsForAdmin } from "@/lib/projects";
import { getSkills } from "@/lib/skills";
import { SignIn } from "@/components/admin/sign-in";
import { ProjectEditor } from "@/components/admin/project-editor";
import { SkillsEditor } from "@/components/admin/skills-editor";
import { ProfileEditor } from "@/components/admin/profile-editor";
import { getProfileContent } from "@/lib/site-profile";
import { iconKey } from "@/lib/icon-key";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-ink-2">Changes go live as soon as you save.</p>
      <Suspense fallback={<p className="mt-8 text-sm text-ink-3">Checking session…</p>}>
        <AdminGate />
      </Suspense>
    </main>
  );
}

async function AdminGate() {
  const email = await getAdmin();
  if (!email) return <SignIn />;
  const [projects, skills, profile] = await Promise.all([getAllProjectsForAdmin(), getSkills(), getProfileContent()]);

  // Logo previews for the saved skills (the icon set stays on the server)
  const icons = Object.fromEntries(
    skills.flatMap((g) => g.items).map((i) => [iconKey(i.name, i.icon), resolveIcon(i.name, i.icon)?.path ?? null]),
  );

  return (
    <>
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
        <ProjectEditor email={email} projects={projects} />
      </section>
      <section className="mt-16">
        <h2 className="text-lg font-semibold tracking-tight">About and contact</h2>
        <ProfileEditor initial={profile} />
      </section>
      <section className="mt-16">
        <h2 className="text-lg font-semibold tracking-tight">Skills</h2>
        <SkillsEditor initial={skills} icons={icons} />
      </section>
    </>
  );
}
