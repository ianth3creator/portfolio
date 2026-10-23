import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** True once the three server env vars are set (lets the site build before Firebase is configured). */
export const firebaseAdminConfigured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY,
);

function app(): App {
  if (!firebaseAdminConfigured) throw new Error("Firebase Admin env vars are missing — see SETUP.md");
  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // .env files store the key with literal \n; dashboards (Vercel) sometimes keep the quotes
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
      }),
    })
  );
}

let dbConfigured = false;
export const adminDb = () => {
  const db = getFirestore(app());
  if (!dbConfigured) {
    // optional fields (e.g. a screenshot without a caption) arrive as undefined; skip them instead of throwing
    db.settings({ ignoreUndefinedProperties: true });
    dbConfigured = true;
  }
  return db;
};
export const adminAuth = () => getAuth(app());
