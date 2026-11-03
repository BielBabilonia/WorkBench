import { useState, type FormEvent } from 'react'
import { useAddComment } from '../../api/queries'
import {
  commentInputSchema,
  STATUSES,
  type Activity,
  type User,
  type WorkOrderDetail,
  type WorkOrderStatus,
} from '../../api/schemas'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Field, Textarea } from '../../components/ui/Field'
import { RelativeTime } from '../../components/ui/RelativeTime'
import { useToast } from '../../components/ui/toast-context'
import { useI18n } from '../../i18n/i18n-context'
import { useErrorMessage } from '../../i18n/use-error-message'
import { fieldErrors, formErrorKey } from '../../lib/form-errors'
import { useSession } from '../../session/session-context'

interface ActivityTimelineProps {
  workOrder: WorkOrderDetail
  users: readonly User[]
}

export function ActivityTimeline({ workOrder, users }: ActivityTimelineProps) {
  const { t } = useI18n()
  const { can } = useSession()
  const nameOf = (id: string | null) => users.find((u) => u.id === id)?.name ?? t('detail.someone')
  const statusName = (value: string | null) =>
    STATUSES.includes(value as WorkOrderStatus) ? t(`status.${value as WorkOrderStatus}`) : ''

  function describe(entry: Activity) {
    const actor = nameOf(entry.actorId)
    switch (entry.kind) {
      case 'created':
        return t('activity.created', { actor })
      case 'status':
        return t('activity.status', { actor, from: statusName(entry.from), to: statusName(entry.to) })
      case 'assigned':
        return entry.to
          ? t('activity.assigned', { actor, assignee: nameOf(entry.to) })
          : t('activity.unassigned', { actor })
      case 'edited':
        return t('activity.edited', { actor })
      case 'checklist':
        return t('activity.checklist', { actor, item: entry.text ?? '' })
      case 'comment':
        return actor
    }
  }

  return (
    <Card>
      <CardHeader title={t('detail.activity')} />
      <ol className="px-5 pt-4 pb-2">
        {workOrder.activity.map((entry, index) => {
          const actor = users.find((u) => u.id === entry.actorId)
          const last = index === workOrder.activity.length - 1
          return (
            <li key={entry.id} className="relative flex gap-3 pb-5">
              {!last && <span aria-hidden className="absolute top-8 bottom-0 left-3 w-px bg-border" />}
              <Avatar user={actor} size="sm" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-fg">
                  <span className={entry.kind === 'comment' ? 'font-medium' : undefined}>{describe(entry)}</span>{' '}
                  <span className="text-xs text-muted">
                    · <RelativeTime date={entry.at} />
                  </span>
                </p>
                {entry.kind === 'comment' && (
                  <p className="mt-1.5 rounded-lg border border-border bg-surface-muted/60 px-3 py-2 whitespace-pre-line">
                    {entry.text}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {can('workOrder.comment') && <CommentForm workOrderId={workOrder.id} />}
    </Card>
  )
}

function CommentForm({ workOrderId }: { workOrderId: string }) {
  const { t } = useI18n()
  const toast = useToast()
  const errorMessage = useErrorMessage()
  const addComment = useAddComment(workOrderId)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = commentInputSchema.safeParse({ text })
    if (!result.success) {
      setError(fieldErrors(result.error).text ?? null)
      return
    }
    setError(null)
    addComment.mutate(result.data.text, {
      onSuccess: () => setText(''),
      onError: (e) => toast(errorMessage(e), 'error'),
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="border-t border-border px-5 py-4 print:hidden">
      <Field label={t('detail.addComment')} error={error ? t(formErrorKey(error)) : undefined}>
        {(props) => (
          <Textarea
            {...props}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('detail.commentPlaceholder')}
          />
        )}
      </Field>
      <div className="mt-3 flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={addComment.isPending}>
          {t('detail.comment')}
        </Button>
      </div>
    </form>
  )
}
