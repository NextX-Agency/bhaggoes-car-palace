"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const inDashboard = usePathname().startsWith("/admin");
  return <div className="container page-wrap">
    <div className="empty-state" role="alert">
      <h1 className="error-title">{inDashboard ? "That action could not be completed" : "This page could not be loaded"}</h1>
      <p>{inDashboard ? "Nothing was changed. Your session may have expired, or the database could not be reached." : "Please try again in a moment."}</p>
      <div className="error-actions">
        <button className="button button-primary" type="button" onClick={reset}>Try again</button>
        {inDashboard ? <Link className="button button-outline" href="/admin/login">Sign in again</Link> : <Link className="button button-outline" href="/">Go to homepage</Link>}
      </div>
    </div>
  </div>;
}
