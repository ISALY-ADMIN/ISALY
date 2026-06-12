import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata = { title: 'Administration — ISALY' }

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
