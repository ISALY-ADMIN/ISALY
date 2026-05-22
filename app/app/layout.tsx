import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F7F8FA' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: '232px' }}>
        {children}
      </div>
    </div>
  )
}
