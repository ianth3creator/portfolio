import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { adminDb, firebaseAdminConfigured } from "@/lib/firebase/admin";
import type { ChatFact } from "@/lib/types";

export const CHAT_TAG = "chat-knowledge";
export const CHAT_DOC = "site/chat";

/** Q&A facts for the "Ask me anything" chat, edited in /admin. Empty until the first save. */
export async function getChatFacts(): Promise<ChatFact[]> {
  "use cache";
  cacheTag(CHAT_TAG);
  cacheLife("max");

  if (!firebaseAdminConfigured) return [];
  const facts = (await adminDb().doc(CHAT_DOC).get()).data()?.facts as ChatFact[] | undefined;
  return facts ?? [];
}
