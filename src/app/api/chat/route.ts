import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { answerFromKnowledge, knowledge, type KnowledgeEntry } from "@/lib/knowledge";
import { getProjects } from "@/lib/projects";
import { getProfileContent } from "@/lib/site-profile";

/**
 * Hybrid answers:
 * 1. If GOOGLE_GENERATIVE_AI_API_KEY is set, ask Gemini (free tier) using ONLY the built-in knowledge + projects.
 * 2. If there's no key, the quota is used up, or anything fails, answer from the built-in knowledge.
 */
const body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1000) }))
    .min(1)
    .max(12),
});

const MODEL = process.env.CHAT_MODEL ?? "gemini-3.5-flash-lite";

// Best-effort per-instance limiter (resets when the server restarts).
const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > 8;
}

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { messages } = parsed.data;
  const question = messages.at(-1)!.content;

  const [projects, profile] = await Promise.all([getProjects(), getProfileContent()]);
  const projectEntries: KnowledgeEntry[] = projects.map((p) => ({
    id: `project-${p.slug}`,
    keywords: [p.title.toLowerCase(), ...p.stack.map((s) => s.toLowerCase()), "project", "projects", "built"],
    answer: `${p.title}: ${p.summary}${p.outcome ? ` — ${p.outcome}` : ""}`,
  }));
  // Live from the editable profile, so answers match what /admin last saved
  const ways = [
    "use the form on the contact page",
    profile.email && `email ${profile.email}`,
    profile.whatsapp && "message me on WhatsApp (the button is on the contact page)",
  ].filter(Boolean);
  const profileEntries: KnowledgeEntry[] = [
    {
      id: "contact",
      keywords: ["contact", "email", "reach", "talk", "call", "message", "whatsapp", "phone", "number", "linkedin", "github", "socials"],
      answer: `You can ${ways.join(", or ")}. I usually reply within a day.${
        profile.links.length ? ` I'm also on ${profile.links.map((l) => l.label).join(", ")}.` : ""
      }`,
    },
    {
      id: "about-me",
      keywords: ["background", "experience", "story", "journey", "about"],
      answer: [profile.statement, ...profile.about].join(" "),
    },
    ...profile.facts.map((f, i) => ({ id: `fact-${i}`, keywords: f.label.toLowerCase().split(/\W+/), answer: `${f.label}: ${f.value}.` })),
  ];
  const extra = [...projectEntries, ...profileEntries];

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || limited(ip)) {
    return Response.json({ answer: answerFromKnowledge(question, extra), source: "built-in" });
  }

  try {
    const facts = [...knowledge, ...extra].map((k) => `- ${k.answer}`).join("\n");
    const { text } = await generateText({
      model: google(MODEL),
      instructions: `You are the assistant on Ian's portfolio site. Speak as Ian in first person, warm and concise (max 3 short sentences).
Only use these facts. If the answer isn't in them, say you don't have that detail and point to the contact page. Never invent clients, numbers or dates.
FACTS:
${facts}`,
      messages,
      maxOutputTokens: 300,
    });
    return Response.json({ answer: text.trim(), source: "ai" });
  } catch {
    return Response.json({ answer: answerFromKnowledge(question, extra), source: "built-in" });
  }
}
