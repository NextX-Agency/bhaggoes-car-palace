import Link from "next/link";

export function EmptyState({ title, text, href, action, headingLevel = 2 }: { title: string; text?: string; href?: string; action?: string; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return <div className="empty-state">
    <Heading>{title}</Heading>
    {text ? <p>{text}</p> : null}
    {href && action ? <Link className="button button-outline" href={href}>{action}</Link> : null}
  </div>;
}
