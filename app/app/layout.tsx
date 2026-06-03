import Sidebar from '@/components/layout/Sidebar'
import { LeaseProvider } from '@/contexts/LeaseContext'
import { Toaster } from '@/components/ui/toaster'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LeaseProvider>
      <div className="flex min-h-screen" style={{ background: '#0A0A0A' }}>
        <Sidebar />
        <div
          className="flex flex-col flex-1 overflow-hidden"
          style={{ marginLeft: 'var(--sidebar-width, 232px)', transition: 'margin-left 0.2s ease' }}
        >
          {children}
        </div>
      </div>
      <Toaster />
    </LeaseProvider>
  )
}
