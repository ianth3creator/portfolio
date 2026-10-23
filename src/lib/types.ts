export type CloudinaryAsset = {
  publicId: string;
  width: number;
  height: number;
  resourceType: "image" | "video";
  /** optional line under the screenshot, e.g. "Checkout flow" */
  caption?: string;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  /** one line shown on the card */
  summary: string;
  /** what problem it solved — the case-study opener */
  problem: string;
  role: string;
  stack: string[];
  /** a measurable result, e.g. "Cut onboarding from 3 days to 20 minutes" */
  outcome: string;
  liveUrl?: string;
  /** name shown on the browser frame and the visit button, e.g. "fluxpay.app" (defaults to the live URL's host) */
  siteName?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  repoUrl?: string;
  cover?: CloudinaryAsset;
  /** desktop screenshots, shown in a browser frame */
  webShots: CloudinaryAsset[];
  /** phone screenshots, shown in a phone frame */
  appShots: CloudinaryAsset[];
  /** anything else: videos, diagrams */
  gallery: CloudinaryAsset[];
  featured: boolean;
  published: boolean;
  /** lower shows first */
  order: number;
  updatedAt: number;
};

export type ProjectInput = Omit<Project, "id" | "updatedAt">;

export type SkillItem = {
  name: string;
  /** Simple Icons slug (simpleicons.org) when the name alone doesn't find the logo */
  icon?: string;
};

export type SkillGroup = {
  title: string;
  note: string;
  items: SkillItem[];
};

/** The editable parts of the About and Contact pages (stored in Firestore, edited in /admin). */
export type ProfileContent = {
  /** the large statement at the top of the About page */
  statement: string;
  about: string[];
  facts: { label: string; value: string }[];
  /** public email; empty hides the email buttons */
  email: string;
  /** international format, digits only; empty hides the WhatsApp button */
  whatsapp: string;
  /** socials and other profiles (GitHub, LinkedIn, X…) */
  links: { label: string; href: string }[];
  /** heading and intro line of the certifications section on the About page */
  certificationsTitle: string;
  certificationsIntro: string;
  /** shown on the About page; the section is hidden while this is empty */
  certifications: Certification[];
};

export type Certification = {
  title: string;
  issuer: string;
  /** free text, e.g. "2025" or "March 2025" */
  date: string;
  description: string;
  /** link to verify the credential, if the issuer provides one */
  credentialUrl?: string;
  /** photo or scan of the certificate */
  image?: CloudinaryAsset;
};
