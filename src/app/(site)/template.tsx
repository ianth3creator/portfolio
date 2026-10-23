/** Re-mounts on every navigation, so each page gets a short fade-up entrance (see .page-enter). */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
