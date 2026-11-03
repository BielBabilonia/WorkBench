import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAssets, useUsers, useWorkOrders } from '../../api/queries'
import { STATUSES } from '../../api/schemas'
import { Avatar } from '../../components/ui/Avatar'
import { Dot } from '../../components/ui/Badge'
import { Card, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatStrip, StatTile, StatTileSkeleton } from '../../components/ui/StatTile'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useI18n } from '../../i18n/i18n-context'
import { cn } from '../../lib/cn'
import { formatDate, formatHours, formatPercent } from '../../lib/format'
import { computeMetrics, technicianWorkload } from '../../lib/metrics'
import { useDocumentTitle } from '../../lib/use-document-title'
import { isOverdue } from '../../lib/workflow'
import { AssetStateBadge, PriorityBadge } from '../work-orders/badges'
import { STATUS_TONE } from '../work-orders/tones'

/** Above this many open hours a technician is flagged. */
const OVERLOAD_HOURS = 16

export function DashboardPage() {
  const { t, locale } = useI18n()
  useDocumentTitle(t('nav.dashboard'))
  const workOrders = useWorkOrders()
  const assets = useAssets()
  const { data: users = [] } = useUsers()

  const all = useMemo(() => workOrders.data ?? [], [workOrders.data])
  const metrics = useMemo(() => computeMetrics(all), [all])
  const workload = useMemo(() => technicianWorkload(all, users), [all, users])
  const assetsById = new Map((assets.data ?? []).map((a) => [a.id, a]))
  const attention = all
    .filter((wo) => wo.status !== 'done' && (isOverdue(wo) || wo.priority === 'critical'))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const unhealthy = (assets.data ?? []).filter((a) => a.state !== 'running')

  if (workOrders.isError) return <ErrorState onRetry={() => workOrders.refetch()} className="py-24" />
  // Lists below would claim "nothing overdue" or "all running" before the data arrives.
  const loading = workOrders.isPending || assets.isPending

  return (
    <div className="space-y-5">
      <PageHeader title={t('dashboard.title')} />

      <StatStrip>
        {workOrders.isPending ? (
          Array.from({ length: 4 }, (_, i) => <StatTileSkeleton key={i} />)
        ) : (
          <>
            <StatTile
              label={t('dashboard.open')}
              value={metrics.open}
              hint={t('dashboard.openHint', { count: metrics.inProgress })}
            />
            <StatTile
              label={t('dashboard.overdue')}
              value={<span className={cn(metrics.overdue > 0 && 'text-danger-fg')}>{metrics.overdue}</span>}
            />
            <StatTile
              label={t('dashboard.completed')}
              value={metrics.completedLast7d}
              hint={t('dashboard.completedHint')}
            />
            <StatTile
              label={t('dashboard.mttr')}
              value={metrics.mttrHours === null ? '—' : formatHours(metrics.mttrHours, locale)}
              hint={t('dashboard.mttrHint', { share: formatPercent(metrics.plannedShare, locale) })}
            />
          </>
        )}
      </StatStrip>

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]" aria-hidden>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <nav aria-label={t('dashboard.byStatus')} className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            {STATUSES.map((status) => (
              <Link
                key={status}
                to={`/work-orders?status=${status}`}
                className="inline-flex items-center gap-1.5 text-muted hover:text-fg"
              >
                <Dot tone={STATUS_TONE[status]} />
                {t(`status.${status}`)}
                <span className="font-medium text-fg tabular-nums">{metrics.byStatus[status]}</span>
              </Link>
            ))}
          </nav>

          <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
            <Card>
              <CardHeader
                title={t('dashboard.attention')}
                actions={
                  <Link to="/work-orders?sort=priority" className="text-xs text-accent hover:underline">
                    {t('dashboard.viewAll')}
                  </Link>
                }
              />
              {attention.length === 0 ? (
                <EmptyState title={t('dashboard.allClear')} />
              ) : (
                <table className="w-full text-[13px]">
                  <tbody className="divide-y divide-border">
                    {attention.map((wo) => (
                      <tr key={wo.id} className="relative hover:bg-surface-muted/60">
                        <td className="w-20 py-2 pl-4 font-mono text-xs text-muted">{wo.code}</td>
                        <td className="py-2 pr-3">
                          <Link to={`/work-orders/${wo.id}`} className="after:absolute after:inset-0 hover:underline">
                            {wo.title}
                          </Link>
                        </td>
                        <td className="hidden py-2 pr-3 font-mono text-xs text-muted sm:table-cell">
                          {assetsById.get(wo.assetId)?.tag}
                        </td>
                        <td className="py-2 pr-3">
                          <PriorityBadge priority={wo.priority} />
                        </td>
                        <td
                          className={cn(
                            'py-2 pr-4 text-right whitespace-nowrap',
                            isOverdue(wo) ? 'text-danger-fg' : 'text-muted',
                          )}
                        >
                          {formatDate(wo.dueDate, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title={t('dashboard.workload')} />
                <ul className="divide-y divide-border text-[13px]">
                  {workload.map(({ user, jobs, hours }) => (
                    <li key={user.id}>
                      <Link
                        to={`/board?assignee=${user.id}`}
                        className="flex items-center gap-2.5 px-4 py-2 hover:bg-surface-muted/60"
                      >
                        <Avatar user={user} size="sm" />
                        <span className="min-w-0 flex-1 truncate">{user.name}</span>
                        <span
                          className={cn(
                            'text-xs tabular-nums',
                            hours > OVERLOAD_HOURS ? 'text-danger-fg' : 'text-muted',
                          )}
                        >
                          {t('dashboard.jobs', { count: jobs })} · {formatHours(hours, locale)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <CardHeader
                  title={t('dashboard.assets')}
                  description={t('dashboard.assetsHint', {
                    running: (assets.data ?? []).length - unhealthy.length,
                    total: (assets.data ?? []).length,
                  })}
                />
                {unhealthy.length === 0 ? (
                  <EmptyState title={t('dashboard.allRunning')} />
                ) : (
                  <ul className="divide-y divide-border text-[13px]">
                    {unhealthy.map((asset) => (
                      <li key={asset.id}>
                        <Link
                          to={`/assets/${asset.id}`}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-surface-muted/60"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-mono text-xs">{asset.tag}</span>{' '}
                            <span className="text-muted">{asset.name}</span>
                          </span>
                          <AssetStateBadge state={asset.state} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
