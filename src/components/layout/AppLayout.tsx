import { Suspense, type ComponentType, type SVGProps } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useUsers } from '../../api/queries'
import type { MessageKey } from '../../i18n/en'
import { useI18n } from '../../i18n/i18n-context'
import { cn } from '../../lib/cn'
import type { Permission } from '../../lib/permissions'
import { useSession } from '../../session/session-context'
import { FactoryIcon, KanbanIcon, LayoutIcon, ListIcon, LogoMark, UsersIcon } from '../ui/icons'
import { ErrorState } from '../ui/States'
import { AccountMenu } from './AccountMenu'
import { PageFallback } from './PageFallback'

interface NavEntry {
  to: string
  label: MessageKey
  icon: ComponentType<SVGProps<SVGSVGElement>>
  permission?: Permission
}

const NAV: NavEntry[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutIcon },
  { to: '/board', label: 'nav.board', icon: KanbanIcon },
  { to: '/work-orders', label: 'nav.workOrders', icon: ListIcon },
  { to: '/assets', label: 'nav.assets', icon: FactoryIcon },
  { to: '/users', label: 'nav.users', icon: UsersIcon, permission: 'user.manage' },
]

function Nav({ className }: { className?: string }) {
  const { t } = useI18n()
  const { can } = useSession()
  return (
    <nav aria-label={t('nav.main')} className={className}>
      <ul className="flex gap-0.5 lg:flex-col">
        {NAV.filter((entry) => !entry.permission || can(entry.permission)).map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] whitespace-nowrap',
                  isActive ? 'bg-surface-muted font-medium text-fg' : 'text-muted hover:bg-surface-muted hover:text-fg',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {t(label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function AppLayout() {
  const { t } = useI18n()
  const { user } = useSession()
  const users = useUsers()

  const brand = (
    <Link to="/" className="flex items-center gap-2 rounded-md px-1.5 text-sm font-semibold">
      <LogoMark className="size-4" />
      {t('app.name')}
      <span
        className="rounded-sm border border-border px-1 text-[11px] font-normal text-muted"
        title={t('app.demoNotice')}
      >
        {t('app.demo')}
      </span>
    </Link>
  )

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('app.skipToContent')}
      </a>

      {/* Desktop: sidebar. */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-bg px-3 py-4 lg:flex print:hidden">
        {brand}
        <Nav className="mt-5" />
        <div className="mt-auto border-t border-border pt-3">
          <AccountMenu placement="up" />
        </div>
      </aside>

      {/* Mobile: top bar. */}
      <header className="border-b border-border bg-bg px-4 pt-3 lg:hidden print:hidden">
        <div className="flex items-center justify-between gap-3">
          {brand}
          <div className="w-44 min-w-0">
            <AccountMenu placement="down" />
          </div>
        </div>
        <Nav className="-mx-2 mt-2 overflow-x-auto pb-2" />
      </header>

      <div className="min-w-0 flex-1">
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[90rem] px-4 py-6 outline-none sm:px-8">
          {users.isError ? (
            <ErrorState onRetry={() => users.refetch()} className="py-24" />
          ) : !user ? (
            <PageFallback />
          ) : (
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  )
}
