import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { useAsset, useUsers, useWorkOrders } from '../../api/queries'
import { NotFoundPage } from '../../components/layout/NotFoundPage'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { ArrowLeftIcon, PlusIcon } from '../../components/ui/icons'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { StatTile } from '../../components/ui/StatTile'
import { useI18n } from '../../i18n/i18n-context'
import { formatDate, formatHours } from '../../lib/format'
import { computeMetrics } from '../../lib/metrics'
import { useDocumentTitle } from '../../lib/use-document-title'
import { useSession } from '../../session/session-context'
import { AssetStateBadge, PriorityBadge, StatusBadge } from '../work-orders/badges'
import { WorkOrderFormModal } from '../work-orders/WorkOrderFormModal'

export function AssetDetailPage() {
  const { id = '' } = useParams()
  const { t, locale } = useI18n()
  const { can } = useSession()
  const asset = useAsset(id)
  const workOrders = useWorkOrders()
  const { data: users = [] } = useUsers()
  const [creating, setCreating] = useState(false)
  useDocumentTitle(asset.data ? `${asset.data.tag} · ${asset.data.name}` : t('nav.assets'))

  if (asset.error instanceof ApiError && asset.error.isNotFound) return <NotFoundPage />
  if (asset.isError) return <ErrorState onRetry={() => asset.refetch()} className="py-24" />
  if (asset.isPending) {
    return (
      <div className="space-y-6" aria-hidden>
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const history = (workOrders.data ?? [])
    .filter((wo) => wo.assetId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const metrics = computeMetrics(history)
  const corrective = history.filter((wo) => wo.type === 'corrective').length

  return (
    <div>
      <Link to="/assets" className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-muted hover:text-fg">
        <ArrowLeftIcon className="size-4" />
        {t('assets.back')}
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted">{asset.data.tag}</span>
            <AssetStateBadge state={asset.data.state} />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{asset.data.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {asset.data.location} · {t('assets.criticality')} {asset.data.criticality} (
            {t(`criticality.${asset.data.criticality}`)})
          </p>
        </div>
        {can('workOrder.create') && (
          <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon />
            {t('workOrders.new')}
          </Button>
        )}
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label={t('dashboard.open')} value={metrics.open} />
        <StatTile label={t('assets.corrective')} value={corrective} hint={t('assets.correctiveHint')} />
        <StatTile
          label={t('dashboard.mttr')}
          value={metrics.mttrHours === null ? '—' : formatHours(metrics.mttrHours, locale)}
        />
        <StatTile label={t('dashboard.overdue')} value={metrics.overdue} />
      </div>

      <Card>
        <CardHeader title={t('assets.history')} />
        {history.length === 0 ? (
          <EmptyState title={t('assets.noHistory')} />
        ) : (
          <ul className="divide-y divide-border px-5 pt-2 pb-2">
            {history.map((wo) => {
              const assignee = users.find((u) => u.id === wo.assigneeId)
              return (
                <li key={wo.id} className="relative flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/work-orders/${wo.id}`}
                      className="text-sm font-medium after:absolute after:inset-0 hover:underline"
                    >
                      {wo.title}
                    </Link>
                    <p className="text-xs text-muted">
                      <span className="font-mono">{wo.code}</span> · {t(`type.${wo.type}`)} ·{' '}
                      {formatDate(wo.createdAt.slice(0, 10), locale)}
                    </p>
                  </div>
                  <PriorityBadge priority={wo.priority} />
                  <StatusBadge status={wo.status} />
                  <Avatar user={assignee} size="sm" />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <WorkOrderFormModal open={creating} onClose={() => setCreating(false)} assetId={id} />
    </div>
  )
}
