import Sidebar from '@/components/layout/Sidebar'
import { LeaseProvider } from '@/contexts/LeaseContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LeaseProvider>
      <div className="flex min-h-screen" style={{ background: '#F0F4F0' }}>
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: 'var(--sidebar-width, 232px)', transition: 'margin-left 0.2s ease' }}>
          {children}
        </div>
      </div>
    </LeaseProvider>
  )
}
