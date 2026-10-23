/**
 * Built-in knowledge for the "Ask me anything" box.
 * - Used directly when no AI key is set or the free AI quota runs out.
 * - Also given to the AI as its only source of truth, so it doesn't invent facts.
 *
 * TODO(Ian): replace every answer below with your own words. Keep them short.
 */
import { profile } from "@/lib/profile";

export type KnowledgeEntry = {
  id: string;
  /** words/phrases that point at this answer */
  keywords: string[];
  answer: string;
};

export const knowledge: KnowledgeEntry[] = [
  {
    id: "intro",
    keywords: ["who", "you", "about", "yourself", "ian", "introduce"],
    answer:
      "I'm Ian — a senior software engineer, software architect and AI engineer based in Nigeria. I design and build web platforms, React Native apps and AI systems end to end.",
  },
  {
    id: "services",
    keywords: ["hire", "work", "services", "build", "freelance", "client", "available", "help"],
    answer:
      "I take on full-stack web platforms, mobile apps and AI features — from architecture through to launch. The quickest way to start is the contact page.",
  },
  {
    id: "stack",
    keywords: ["stack", "tech", "skills", "tools", "languages", "react", "next", "node", "typescript", "python"],
    answer:
      "Day to day: TypeScript, Python, React, Next.js, React Native, Node, Firebase and Postgres, plus LLM tooling for AI features.",
  },
  {
    id: "ai",
    keywords: ["ai", "llm", "machine", "agents", "agent", "gpt", "claude", "gemini"],
    answer:
      "On the AI side I build agent workflows, tool calling and AI features inside real products — this chat box is one small example.",
  },
  {
    id: "company",
    keywords: ["gem-it", "gem", "company", "founded", "founder", "startup", "africa", "african"],
    answer: "I founded GEM-IT, a company built toward the growth and evolution of Africa's technology.",
  },
  {
    id: "contact",
    keywords: ["contact", "email", "reach", "talk", "call", "message", "linkedin", "github", "whatsapp", "phone", "number"],
    answer: `Use the form on the contact page, email ${profile.email}, or message me on WhatsApp. I usually reply within a day.`,
  },
];

const FALLBACK =
  "I don't have a ready answer for that one. Try asking about my work, stack, projects or how to hire me — or reach out directly via the contact page.";

/** Very small keyword scorer — good enough for a handful of entries. */
export function answerFromKnowledge(question: string, extra: KnowledgeEntry[] = []): string {
  const words: string[] = question.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  let best: { score: number; entry?: KnowledgeEntry } = { score: 0 };
  for (const entry of [...knowledge, ...extra]) {
    const score = entry.keywords.reduce(
      (s, k) => s + (k.includes(" ") ? (question.toLowerCase().includes(k) ? 2 : 0) : words.includes(k) ? 1 : 0),
      0,
    );
    if (score > best.score) best = { score, entry };
  }
  return best.entry?.answer ?? FALLBACK;
}
