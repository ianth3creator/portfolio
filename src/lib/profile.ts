/**
 * Everything the home page says about Ian that isn't a project.
 * The chat's built-in answers (lib/knowledge.ts) should agree with this file.
 *
 * TODO(Ian): rewrite the statement and about paragraphs in your own words.
 */
import type { SkillGroup } from "@/lib/types";

export const profile = {
  name: "Ian",
  location: "Nigeria",
  email: "ianthecr8tiveengineer@gmail.com",
  /** WhatsApp number in international format, digits only (e.g. "2348012345678"). Empty hides the button. */
  whatsapp: "2348146003773",
  /**
   * Web3Forms access key: contact-form messages are emailed to the Web3Forms account's address.
   * It's a public key (safe in client code); the form only works from the domain set in Web3Forms.
   */
  contactFormKey: "b4d70beb-f6e8-4fc1-a7c9-16febf6cc0ea",
  /** shown as the large statement in the About section */
  statement:
    "I design and build software end to end: web platforms, mobile apps and AI systems that hold up once real people start using them.",
  about: [
    "Most of my work sits where product, architecture and engineering meet. I like taking an idea from a rough sketch to something running in production, and making the decisions in between that keep it simple to change later.",
    "Lately that means AI features inside real products: agent workflows, tool calling and the plumbing that makes them reliable. I also founded GEM-IT, a company built toward the growth and evolution of Africa's technology.",
  ],
  facts: [
    { label: "Based in", value: "Nigeria, working worldwide" },
    { label: "Focus", value: "Web, mobile and AI products" },
    { label: "Open to", value: "Freelance and contract work" },
  ],
  links: [
    { label: "GitHub", href: "https://github.com/ianth3creator" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/ian-theengineer-647090431" },
  ],
} as const;

/**
 * Starting skills. Once you save skills in /admin they live in Firestore and this list
 * is only the fallback. Logos come from Simple Icons, matched by name (see lib/icons.ts).
 */
export const defaultSkills: SkillGroup[] = [
  {
    title: "Engineering",
    note: "Shipping product, front to back.",
    items: ["TypeScript", "Python", "React", "Next.js", "React Native", "Node.js", "Firebase", "PostgreSQL"].map((name) => ({ name })),
  },
  {
    title: "Architecture",
    note: "Systems that stay easy to change.",
    items: ["System design", "API design", "Data modelling", "Cloud & serverless", "Performance", "Code review"].map((name) => ({ name })),
  },
  {
    title: "AI engineering",
    note: "LLMs inside real products.",
    items: ["Agent workflows", "Tool calling", "Evaluation", "Prompt design"].map((name) => ({ name })),
  },
];
