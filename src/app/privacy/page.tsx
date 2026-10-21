import type { Metadata } from "next";
import { PolicyBody } from "@/components/policy-body";
import { getPublishedPage } from "@/lib/data";
import { privacyPolicyDefault } from "@/lib/policy-defaults";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("privacy");
  return {
    title: page?.seo_title || page?.title || "Privacy Policy",
    description: page?.seo_description || "How Bhaggoes Car Palace handles website browsing and contact information.",
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage() {
  const page = await getPublishedPage("privacy");
  return <div className="container page-wrap">
    <div className="page-intro"><h1>{page?.title ?? "Privacy policy"}</h1></div>
    <article className="policy-copy"><PolicyBody body={page?.body || privacyPolicyDefault} /></article>
  </div>;
}
