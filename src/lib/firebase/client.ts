"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/** Created on first use (in the browser), so builds work before Firebase is configured. */
export function getClientAuth(): Auth {
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  return getAuth(app);
}
