import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return <div className="container page-wrap">
    <div className="page-intro"><h1>Page not found</h1></div>
    <EmptyState title="This page or car is no longer listed" text="The car may have been sold or the link may be out of date." href="/cars" action="Browse available cars" />
  </div>;
}
