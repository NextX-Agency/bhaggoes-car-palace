import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default async function NotFound() {
  // With the catalog switched off there is no inventory to go back to, so the way out is the homepage.
  const { catalog_hidden: hidden } = await getSettings();
  return <div className="container page-wrap">
    <div className="page-intro"><h1>Page not found</h1></div>
    {hidden
      ? <EmptyState title="This page is no longer available" text="The link may be out of date. Our homepage has our showrooms and contact details." href="/" action="Go to the homepage" />
      : <EmptyState title="This page or car is no longer listed" text="The car may have been sold or the link may be out of date." href="/cars" action="Browse cars" />}
  </div>;
}
