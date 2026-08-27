import Sidebar from '@/components/layout/Sidebar'
import { LeaseProvider } from '@/contexts/LeaseContext'
import { Toaster } from '@/components/ui/toaster'
import BugReportWidget from '@/components/bug-report/BugReportWidget'
import RoleGate from '@/components/onboarding/RoleGate'

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
      {/* Garde de rôle : repose la question d'onboarding, de façon bloquante,
          aux comptes qui n'y ont jamais répondu (role_confirmed_at NULL). */}
      <RoleGate />
      {/* Monté une seule fois ici : le bouton « signaler un bug » est présent
          sur toutes les pages /app/* sans duplication par page (bêta). */}
      <BugReportWidget />
      <Toaster />
    </LeaseProvider>
  )
}
