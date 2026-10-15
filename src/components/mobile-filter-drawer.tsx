"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function MobileFilterDrawer({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button className="mobile-filter-button" type="button"><SlidersHorizontal size={15} /> Filters{activeCount ? <span aria-label={`${activeCount} active filters`}>{activeCount}</span> : null}</button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="filter-drawer-overlay" />
      <Dialog.Content className="filter-drawer-content">
        <header className="filter-drawer-header"><div><Dialog.Title>Refine your search</Dialog.Title><Dialog.Description>Choose the details that matter to you.</Dialog.Description><Dialog.Close asChild><Link className="filter-drawer-clear" href="/cars">Clear filters</Link></Dialog.Close></div><Dialog.Close asChild><button className="filter-drawer-close" type="button" aria-label="Close filters"><X size={18} /></button></Dialog.Close></header>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
