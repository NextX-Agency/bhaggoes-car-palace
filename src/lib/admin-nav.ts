import { CarFront, Files, Images, Inbox, LayoutDashboard, Settings2 } from "lucide-react";
import { websiteInquiriesEnabled } from "@/lib/features";

export const adminNavItems = [
  ["Overzicht", "/admin", LayoutDashboard],
  ["Voorraad", "/admin/inventory", CarFront],
  ["Snel uploaden", "/admin/inventory/bulk", Images],
  ...(websiteInquiriesEnabled ? [["Aanvragen", "/admin/inquiries", Inbox] as const] : []),
  ["Website-instellingen", "/admin/settings", Settings2],
  ["Pagina’s & FAQ", "/admin/content", Files],
] as const;
