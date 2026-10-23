import type { Metadata, Viewport } from "next";
import { Host_Grotesk, Geist_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import "./globals.css";

const host = Host_Grotesk({
  variable: "--font-host",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Ian — The Software Engineer", template: "%s — Ian" },
  description:
    "Ian is a senior software engineer, software architect and AI engineer building web platforms, mobile apps and AI systems.",
};

export const viewport: Viewport = {
  themeColor: "#f8f6f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${host.variable} ${mono.variable} antialiased`}>
      <body className="min-h-dvh">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
