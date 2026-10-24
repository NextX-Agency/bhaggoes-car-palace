"use client";

import Link from "next/link";
import { useEffect } from "react";

// Shown when a dashboard page or a save/archive action throws (expired session, database unreachable).
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="admin-login-wrap"><section className="admin-login" role="alert">
    <h1>Dat is niet gelukt</h1>
    <p>De actie kon niet worden voltooid. Je sessie kan zijn verlopen of de database is even niet bereikbaar. Controleer de voorraad voordat je het opnieuw probeert.</p>
    <button className="button button-primary" type="button" onClick={() => retry()}>Opnieuw proberen</button>
    <Link className="button button-outline" href="/admin/login">Opnieuw inloggen</Link>
    <Link className="button button-ghost" href="/admin">Naar het overzicht</Link>
  </section></div>;
}
