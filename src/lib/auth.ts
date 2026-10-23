import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { adminAuth, firebaseAdminConfigured } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "__session";

/** Returns the admin's email when the request carries a valid session for ADMIN_EMAIL, else null. */
export async function getAdmin(): Promise<string | null> {
  // Session checks compare against the current time (Date.now inside Firebase), so they
  // must only run per request, never while Next prerenders the page.
  await connection();
  if (!firebaseAdminConfigured) return null;
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return isAdminEmail(decoded.email) ? decoded.email! : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<string> {
  const email = await getAdmin();
  if (!email) throw new Error("Unauthorized");
  return email;
}

export function isAdminEmail(email?: string | null) {
  const allowed = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  return Boolean(allowed && email && email.toLowerCase() === allowed);
}
