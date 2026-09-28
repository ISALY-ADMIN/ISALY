import { getAdminUser } from '@/lib/admin/getAdminUser'
import { AdminShell } from '@/components/ui-v2/admin/AdminShell'

export const metadata = { title: 'Administration — ISALY' }
export const dynamic = 'force-dynamic'

/**
 * Site v2 : coque de l'administration (mêmes classes que l'espace connecté).
 * La garde existante getAdminUser (profiles.is_admin côté serveur) s'applique
 * aussi ici, en plus de celle de chaque page.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser()
  const name = [admin.first_name, admin.last_name].filter(Boolean).join(' ')
  return <AdminShell email={admin.email} name={name}>{children}</AdminShell>
}

/* [HIDDEN] Ancienne mise en page (barre latérale sombre AdminSidebar) :
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#0A0A0A' }}>
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: '220px' }}>
        {children}
      </div>
    </div>
  )
}
*/
