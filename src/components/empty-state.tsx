import Link from "next/link";
import type { ReactNode } from "react";
import { CarFront } from "lucide-react";

export function EmptyState({ title, text, href, action, icon, headingLevel = 2 }: { title: string; text?: string; href?: string; action?: string; icon?: ReactNode; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return <div className="empty-state">
    <span className="empty-icon" aria-hidden="true">{icon ?? <CarFront size={22} />}</span>
    <Heading>{title}</Heading>
    {text ? <p>{text}</p> : null}
    {href && action ? <Link className="button button-outline" href={href}>{action}</Link> : null}
  </div>;
}
