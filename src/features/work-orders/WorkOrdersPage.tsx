import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAssets, useUsers, useWorkOrders } from '../../api/queries'
import { STATUSES, type WorkOrder, type WorkOrderStatus } from '../../api/schemas'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Field'
import { DownloadIcon, PlusIcon } from '../../components/ui/icons'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useI18n } from '../../i18n/i18n-context'
import { cn } from '../../lib/cn'
import { csvDelimiter, downloadCsv, toCsv } from '../../lib/csv'
import { formatDate, formatHours } from '../../lib/format'
import { useDocumentTitle } from '../../lib/use-document-title'
import { isOverdue, toIsoDate } from '../../lib/workflow'
import { useCurrentUser, useSession } from '../../session/session-context'
import { PriorityBadge, StatusBadge, TypeLabel } from './badges'
import { matchesFilters, useWorkOrderFilters } from './filters'
import { WorkOrderFilters } from './WorkOrderFilters'
import { WorkOrderFormModal } from './WorkOrderFormModal'

type SortKey = 'due' | 'priority' | 'created'
const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 }

const SORTS: Record<SortKey, (a: WorkOrder, b: WorkOrder) => number> = {
  due: (a, b) => a.dueDate.localeCompare(b.dueDate),
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.dueDate.localeCompare(b.dueDate),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
}

export function WorkOrdersPage() {
  const { t, locale } = useI18n()
  useDocumentTitle(t('nav.workOrders'))
  const me = useCurrentUser()
  const { can } = useSession()
  const workOrders = useWorkOrders()
  const { data: assets = [] } = useAssets()
  const { data: users = [] } = useUsers()
  const [filters, setFilters] = useWorkOrderFilters()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)

  const status = (STATUSES as readonly string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as WorkOrderStatus)
    : 'all'
  const sort: SortKey = (['due', 'priority', 'created'] as const).find((s) => s === params.get('sort')) ?? 'due'
  const setParam = (key: string, value: string, fallback: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === fallback) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  const assetsById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const rows = useMemo(
    () =>
      (workOrders.data ?? [])
        .filter((wo) => status === 'all' || wo.status === status)
        .filter((wo) => matchesFilters(wo, filters, me, assetsById.get(wo.assetId)))
        .sort(SORTS[sort]),
    [workOrders.data, status, filters, me, assetsById, sort],
  )

  function exportCsv() {
    const header = [
      t('csv.code'),
      t('csv.title'),
      t('csv.asset'),
      t('csv.type'),
      t('csv.priority'),
      t('csv.status'),
      t('csv.assignee'),
      t('csv.due'),
      t('csv.hours'),
      t('csv.created'),
      t('csv.completed'),
    ]
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    const body = rows.map((wo) => [
      wo.code,
      wo.title,
      assetsById.get(wo.assetId)?.tag ?? '',
      t(`type.${wo.type}`),
      t(`priority.${wo.priority}`),
      t(`status.${wo.status}`),
      (wo.assigneeId && usersById.get(wo.assigneeId)?.name) || '',
      wo.dueDate,
      number.format(wo.estimatedHours),
      wo.createdAt.slice(0, 10),
      wo.completedAt?.slice(0, 10) ?? '',
    ])
    downloadCsv(`work-orders-${toIsoDate(new Date())}.csv`, toCsv([header, ...body], csvDelimiter(locale)))
  }

  return (
    <div>
      <PageHeader
        title={t('workOrders.title')}
        actions={
          <>
            <Button onClick={exportCsv} disabled={rows.length === 0}>
              <DownloadIcon />
              {t('workOrders.export')}
            </Button>
            {can('workOrder.create') && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <PlusIcon />
                {t('workOrders.new')}
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
        <div className="lg:flex-1">
          <WorkOrderFilters filters={filters} onChange={setFilters} users={users} />
        </div>
        <div className="mb-4 flex gap-2">
          <Select
            aria-label={t('filters.status')}
            value={status}
            onChange={(e) => setParam('status', e.target.value, 'all')}
            className="sm:w-40"
          >
            <option value="all">{t('filters.anyStatus')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('workOrders.sort')}
            value={sort}
            onChange={(e) => setParam('sort', e.target.value, 'due')}
            className="sm:w-44"
          >
            <option value="due">{t('workOrders.sortDue')}</option>
            <option value="priority">{t('workOrders.sortPriority')}</option>
            <option value="created">{t('workOrders.sortCreated')}</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {workOrders.isError ? (
          <ErrorState onRetry={() => workOrders.refetch()} />
        ) : workOrders.isPending ? (
          <div className="space-y-3 p-5" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={t('workOrders.emptyTitle')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t('workOrders.tableCaption', { count: rows.length })}</caption>
              <thead className="border-b border-border bg-surface-muted/50 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {t('workOrders.col.workOrder')}
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
                    {t('workOrders.col.asset')}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {t('workOrders.col.status')}
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    {t('workOrders.col.priority')}
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">
                    {t('workOrders.col.assignee')}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {t('workOrders.col.due')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((wo) => {
                  const asset = assetsById.get(wo.assetId)
                  const assignee = wo.assigneeId ? usersById.get(wo.assigneeId) : undefined
                  const overdue = isOverdue(wo)
                  return (
                    <tr key={wo.id} className="relative hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/work-orders/${wo.id}`}
                          className="font-medium text-fg after:absolute after:inset-0 hover:underline"
                        >
                          {wo.title}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-xs text-muted">{wo.code}</span>
                          <TypeLabel type={wo.type} />
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="font-mono text-xs">{asset?.tag}</span>
                        <div className="max-w-48 truncate text-xs text-muted">{asset?.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={wo.status} />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <PriorityBadge priority={wo.priority} />
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className="flex items-center gap-2">
                          <Avatar user={assignee} size="sm" />
                          <span className={cn(!assignee && 'text-muted')}>
                            {assignee?.name ?? t('common.unassigned')}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn(overdue && 'font-medium text-danger-fg')}>
                          {formatDate(wo.dueDate, locale)}
                        </span>
                        {overdue && <div className="text-xs text-danger-fg">{t('common.overdue')}</div>}
                        <div className="text-xs text-muted">{formatHours(wo.estimatedHours, locale)}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <WorkOrderFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
