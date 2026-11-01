import { AdminFrame } from "@/components/admin-frame";
import { AdminUsers } from "@/components/admin-users";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminUsers } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";
import { generateTemporaryPassword } from "@/lib/temp-password";

export const metadata = { title: "Gebruikers" };

export default async function AdminUsersPage() {
  const { user } = await requireAdmin();
  const { users, ready } = await getAdminUsers();
  return <AdminFrame active="/admin/users" email={user.email ?? "Beheerder"}>
    <p className="admin-inventory-intro">Geef collega’s een eigen account voor dit beheer. Je kiest een tijdelijk wachtwoord en stuurt het door; na het inloggen kiezen ze zelf een nieuw wachtwoord.</p>
    {ready ? <AdminUsers users={users} currentUserId={user.id} siteUrl={siteUrl()} initialPassword={generateTemporaryPassword()} /> : <p className="catalog-switch is-hidden"><span className="catalog-switch-text"><strong>Gebruikersbeheer is nog niet geactiveerd</strong><span>De database heeft eerst een update (migratie) nodig. Daarna verschijnen hier alle accounts.</span></span></p>}
  </AdminFrame>;
}
