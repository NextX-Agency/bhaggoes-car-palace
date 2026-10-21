import type { Metadata } from "next";
import { PolicyBody } from "@/components/policy-body";
import { getPublishedPage } from "@/lib/data";
import { termsPolicyDefault } from "@/lib/policy-defaults";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("terms");
  return {
    title: page?.seo_title || page?.title || "Terms and Conditions",
    description: page?.seo_description || "Website terms for browsing vehicles at Bhaggoes Car Palace.",
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const page = await getPublishedPage("terms");
  return <div className="container page-wrap">
    <div className="page-intro"><h1>{page?.title ?? "Terms and conditions"}</h1></div>
    <article className="policy-copy"><PolicyBody body={page?.body || termsPolicyDefault} /></article>
  </div>;
}
