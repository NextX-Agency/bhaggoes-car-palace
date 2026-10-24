"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

// Admin pages load live data, so a tap can take a moment. The spinner slot is always rendered to avoid layout shift.
function Pending() {
  const { pending } = useLinkStatus();
  return <LoaderCircle className={`admin-nav-pending${pending ? " is-pending" : ""}`} size={15} aria-hidden="true" />;
}

export function AdminNavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return <Link className={active ? "active" : ""} aria-current={active ? "page" : undefined} href={href}>{children}<Pending /></Link>;
}
