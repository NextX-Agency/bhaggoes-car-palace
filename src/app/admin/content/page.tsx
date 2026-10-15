import { AdminFrame } from "@/components/admin-frame";
import { AdminContentManager } from "@/components/admin-content-manager";
import { getAdminFaqs, getAdminPages } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminContentPage() { const { user } = await requireAdmin(); const [faqs, pages] = await Promise.all([getAdminFaqs(), getAdminPages()]); return <AdminFrame active="/admin/content" email={user.email ?? "Administrator"}><AdminContentManager faqs={faqs} pages={pages} /></AdminFrame>; }
