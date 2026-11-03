import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import {
  useAssets,
  useDeleteWorkOrder,
  useMoveWorkOrder,
  useToggleChecklistItem,
  useUsers,
  useWorkOrder,
} from '../../api/queries'
import { STATUSES, type WorkOrderDetail, type WorkOrderStatus } from '../../api/schemas'
import { NotFoundPage } from '../../components/layout/NotFoundPage'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Select } from '../../components/ui/Field'
import { ArrowLeftIcon, CheckIcon, PencilIcon, PrinterIcon, TrashIcon } from '../../components/ui/icons'
import { Modal } from '../../components/ui/Modal'
import { RelativeTime } from '../../components/ui/RelativeTime'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast-context'
import { useI18n } from '../../i18n/i18n-context'
import { useErrorMessage } from '../../i18n/use-error-message'
import { cn } from '../../lib/cn'
import { formatDate, formatDateTime, formatHours } from '../../lib/format'
import { canMove, canToggleChecklist } from '../../lib/permissions'
import { useDocumentTitle } from '../../lib/use-document-title'
import { checklistProgress, isOverdue, moveBlocker } from '../../lib/workflow'
import { useCurrentUser, useSession } from '../../session/session-context'
import { ActivityTimeline } from './ActivityTimeline'
import { PriorityBadge, StatusBadge } from './badges'
import { WorkOrderFormModal } from './WorkOrderFormModal'

export function WorkOrderDetailPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const workOrder = useWorkOrder(id)
  useDocumentTitle(workOrder.data ? `${workOrder.data.code} · ${workOrder.data.title}` : t('nav.workOrders'))

  if (workOrder.error instanceof ApiError && workOrder.error.isNotFound) return <NotFoundPage />
  if (workOrder.isError) return <ErrorState onRetry={() => workOrder.refetch()} className="py-24" />
  if (workOrder.isPending) return <DetailSkeleton />
  return <Detail workOrder={workOrder.data} />
}

function Detail({ workOrder }: { workOrder: WorkOrderDetail }) {
  const { t, locale } = useI18n()
  const user = useCurrentUser()
  const { can } = useSession()
  const toast = useToast()
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const { data: assets = [] } = useAssets()
  const { data: users = [] } = useUsers()
  const move = useMoveWorkOrder()
  const toggle = useToggleChecklistItem(workOrder.id)
  const remove = useDeleteWorkOrder()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const asset = assets.find((a) => a.id === workOrder.assetId)
  const userById = (id: string | null) => (id ? users.find((u) => u.id === id) : undefined)
  const assignee = userById(workOrder.assigneeId)
  const creator = userById(workOrder.createdById)
  const progress = checklistProgress(workOrder)
  const overdue = isOverdue(workOrder)
  const canChangeStatus = STATUSES.some((s) => s !== workOrder.status && canMove(user, workOrder, s))
  const checklistEditable = canToggleChecklist(user, workOrder)

  function statusOption(status: WorkOrderStatus) {
    if (status === workOrder.status) return { disabled: false, hint: '' }
    if (!canMove(user, workOrder, status)) return { disabled: true, hint: t('board.blocked.permission') }
    const blocker = moveBlocker(workOrder, status)
    if (blocker === 'unassigned') return { disabled: true, hint: t('board.blocked.unassigned') }
    if (blocker === 'checklist_incomplete') return { disabled: true, hint: t('board.blocked.checklist') }
    return { disabled: false, hint: '' }
  }

  function changeStatus(status: WorkOrderStatus) {
    move.mutate(
      { id: workOrder.id, move: { status, index: 0 } },
      {
        onSuccess: () => toast(t('toast.moved', { code: workOrder.code, status: t(`status.${status}`) })),
        onError: (error) => toast(errorMessage(error), 'error'),
      },
    )
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(workOrder.id)
      toast(t('toast.deleted', { code: workOrder.code }))
      navigate('/work-orders')
    } catch (error) {
      toast(errorMessage(error), 'error')
    }
  }

  return (
    <article>
      <Link
        to="/board"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-muted hover:text-fg print:hidden"
      >
        <ArrowLeftIcon className="size-4" />
        {t('detail.backToBoard')}
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted">{workOrder.code}</span>
            <StatusBadge status={workOrder.status} />
            <PriorityBadge priority={workOrder.priority} />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{workOrder.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {canChangeStatus && (
            // Wrapped: the input styles set w-full, and a w-* class here would fight it.
            <div className="w-52">
              <Select
                aria-label={t('detail.changeStatus')}
                value={workOrder.status}
                onChange={(e) => changeStatus(e.target.value as WorkOrderStatus)}
                disabled={move.isPending}
              >
                {STATUSES.map((status) => {
                  const option = statusOption(status)
                  return (
                    <option key={status} value={status} disabled={option.disabled}>
                      {t(`status.${status}`)}
                      {option.hint && ` — ${option.hint}`}
                    </option>
                  )
                })}
              </Select>
            </div>
          )}
          {can('workOrder.edit') && (
            <Button onClick={() => setEditing(true)}>
              <PencilIcon />
              {t('common.edit')}
            </Button>
          )}
          <Button onClick={() => window.print()} title={t('detail.printHint')}>
            <PrinterIcon />
            {t('detail.print')}
          </Button>
          {can('workOrder.delete') && (
            <Button variant="ghost" onClick={() => setDeleting(true)} aria-label={t('common.delete')}>
              <TrashIcon />
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] print:block print:space-y-6">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={t('detail.description')} />
            <p className="px-5 pt-2 pb-5 text-sm leading-relaxed whitespace-pre-line text-fg">
              {workOrder.description || <span className="text-muted">{t('detail.noDescription')}</span>}
            </p>
          </Card>

          <Card>
            <CardHeader
              title={t('detail.checklist')}
              description={
                progress.total
                  ? t('detail.checklistProgress', { done: progress.done, total: progress.total })
                  : undefined
              }
            />
            {progress.total === 0 ? (
              <p className="px-5 pt-2 pb-5 text-sm text-muted">{t('detail.noChecklist')}</p>
            ) : (
              <>
                <div
                  className="mx-5 mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted"
                  role="progressbar"
                  aria-label={t('detail.checklist')}
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-valuenow={progress.done}
                >
                  <div
                    className="h-full rounded-full bg-success transition-[width]"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
                <ul className="px-3 pt-2 pb-3">
                  {workOrder.checklist.map((item) => (
                    <li key={item.id}>
                      <label
                        className={cn(
                          'flex items-start gap-3 rounded-lg px-2 py-2 text-sm',
                          checklistEditable && 'cursor-pointer hover:bg-surface-muted',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          disabled={!checklistEditable}
                          onChange={(e) =>
                            toggle.mutate(
                              { itemId: item.id, done: e.target.checked },
                              { onError: (error) => toast(errorMessage(error), 'error') },
                            )
                          }
                          className="mt-0.5 size-4 shrink-0 accent-(--success)"
                        />
                        <span className={cn(item.done && 'text-muted line-through')}>{item.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <ActivityTimeline workOrder={workOrder} users={users} />
        </div>

        <aside>
          <Card>
            <CardHeader title={t('detail.details')} />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 px-5 pt-3 pb-5 text-sm">
              <dt className="text-muted">{t('detail.asset')}</dt>
              <dd className="min-w-0">
                {asset ? (
                  <Link to={`/assets/${asset.id}`} className="hover:underline">
                    <span className="font-mono">{asset.tag}</span>
                    <span className="block truncate text-xs text-muted">{asset.name}</span>
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
              <dt className="text-muted">{t('detail.location')}</dt>
              <dd>{asset?.location ?? '—'}</dd>
              <dt className="text-muted">{t('detail.type')}</dt>
              <dd>{t(`type.${workOrder.type}`)}</dd>
              <dt className="text-muted">{t('detail.assignee')}</dt>
              <dd className="flex items-center gap-2">
                <Avatar user={assignee} size="sm" />
                <span className={cn(!assignee && 'text-muted')}>{assignee?.name ?? t('common.unassigned')}</span>
              </dd>
              <dt className="text-muted">{t('detail.due')}</dt>
              <dd className={cn(overdue && 'font-medium text-danger-fg')}>
                {formatDate(workOrder.dueDate, locale)}
                {overdue && ` · ${t('common.overdue')}`}
              </dd>
              <dt className="text-muted">{t('detail.estimate')}</dt>
              <dd>{formatHours(workOrder.estimatedHours, locale)}</dd>
              <dt className="text-muted">{t('detail.created')}</dt>
              <dd>
                <RelativeTime date={workOrder.createdAt} />
                {creator && <span className="block text-xs text-muted">{creator.name}</span>}
              </dd>
              {workOrder.completedAt && (
                <>
                  <dt className="text-muted">{t('detail.completed')}</dt>
                  <dd className="flex items-center gap-1.5 text-success-fg">
                    <CheckIcon className="size-4" />
                    {formatDateTime(workOrder.completedAt, locale)}
                  </dd>
                </>
              )}
            </dl>
          </Card>
        </aside>
      </div>

      <WorkOrderFormModal open={editing} onClose={() => setEditing(false)} workOrder={workOrder} />

      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        size="sm"
        title={t('detail.deleteTitle', { code: workOrder.code })}
        description={t('detail.deleteBody')}
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setDeleting(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={remove.isPending}>
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </article>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-9 w-2/3" />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}
