// [HIDDEN] ancienne barre latérale, remplacée par la coque v2 :
// import Sidebar from '@/components/layout/Sidebar'
import AppShell from '@/components/ui-v2/shell/AppShell'
import { bricolage } from '@/components/ui-v2/font'
import { LeaseProvider } from '@/contexts/LeaseContext'
import { Toaster } from '@/components/ui/toaster'
import BugReportWidget from '@/components/bug-report/BugReportWidget'
import RoleGate from '@/components/onboarding/RoleGate'
// Dashboard v2 : composants portés de la maquette, limités à .ui-v2.
import '@/styles/ui-v2.css'
import '@/styles/ui-v2-app.css'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LeaseProvider>
      {/* Dashboard v2 : coque (barre latérale, barre du haut, barre du bas
          mobile) portée de design/isaly-dashboard-v2.html. */}
      <AppShell fontClass={bricolage.variable}>{children}</AppShell>
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

/* [HIDDEN] Ancienne coque (dashboard v1), remplacée par AppShell :
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
      <RoleGate />
      <BugReportWidget />
      <Toaster />
    </LeaseProvider>
  )
}
*/
