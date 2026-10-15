"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function MobileFilterDrawer({ activeCount, formId, children }: { activeCount: number; formId: string; children: ReactNode }) {
  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button className="mobile-filter-button" type="button" aria-label={activeCount ? `Filters, ${activeCount} active` : "Filters"}>
        <SlidersHorizontal size={16} aria-hidden="true" /> Filters{activeCount ? <span className="count" aria-hidden="true">{activeCount}</span> : null}
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="filter-drawer-overlay" />
      <Dialog.Content className="filter-drawer-content" aria-describedby={undefined}>
        <header className="filter-drawer-header">
          <Dialog.Title>Filter cars</Dialog.Title>
          <Dialog.Close asChild><button className="filter-drawer-close" type="button" aria-label="Close filters"><X size={20} /></button></Dialog.Close>
        </header>
        <div className="filter-drawer-body">{children}</div>
        <footer className="filter-drawer-footer">
          <Dialog.Close asChild><Link className="button button-outline" href="/cars">Clear all</Link></Dialog.Close>
          <button className="button button-primary" type="submit" form={formId}>Apply filters</button>
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
