"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

/** Submit button that locks and shows a spinner while its parent form's action runs, so a second tap cannot fire twice. */
export function PendingSubmit({ children, pendingLabel, className }: { children: ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending} aria-busy={pending || undefined}>{pending ? <><LoaderCircle size={16} className="spin" aria-hidden="true" />{pendingLabel ?? children}</> : children}</button>;
}
