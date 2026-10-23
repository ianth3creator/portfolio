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
