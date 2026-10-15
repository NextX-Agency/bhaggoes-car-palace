import { CarFront, Files, Inbox, LayoutDashboard, Settings2 } from "lucide-react";

export const adminNavItems = [
  ["Overview", "/admin", LayoutDashboard],
  ["Inventory", "/admin/inventory", CarFront],
  ["Inquiries", "/admin/inquiries", Inbox],
  ["Website settings", "/admin/settings", Settings2],
  ["Pages & FAQs", "/admin/content", Files],
] as const;
