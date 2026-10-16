import { CarFront, Files, Inbox, LayoutDashboard, Settings2 } from "lucide-react";
import { websiteInquiriesEnabled } from "@/lib/features";

export const adminNavItems = [
  ["Overview", "/admin", LayoutDashboard],
  ["Inventory", "/admin/inventory", CarFront],
  ...(websiteInquiriesEnabled ? [["Inquiries", "/admin/inquiries", Inbox] as const] : []),
  ["Website settings", "/admin/settings", Settings2],
  ["Pages & FAQs", "/admin/content", Files],
] as const;
