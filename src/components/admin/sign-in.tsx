"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { createSession } from "@/app/admin/actions";

export function SignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const res = await createSession(await cred.user.getIdToken());
      await fbSignOut(auth); // the server cookie is the session from here on
      if (!res.ok) setError(res.error);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass mt-8 p-6">
      <p className="text-sm text-ink-2">Sign in with the Google account set as ADMIN_EMAIL.</p>
      <button
        onClick={go}
        disabled={busy}
        className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition active:scale-[0.97] disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Continue with Google"}
      </button>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
