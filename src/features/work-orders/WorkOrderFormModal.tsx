import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssets, useCreateWorkOrder, useUpdateWorkOrder, useUsers } from '../../api/queries'
import {
  PRIORITIES,
  WORK_TYPES,
  workOrderInputSchema,
  workOrderPatchSchema,
  type WorkOrder,
  type WorkOrderInput,
} from '../../api/schemas'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast-context'
import { useI18n } from '../../i18n/i18n-context'
import { useErrorMessage } from '../../i18n/use-error-message'
import { fieldErrors, formErrorKey } from '../../lib/form-errors'
import { toIsoDate } from '../../lib/workflow'
import { useSession } from '../../session/session-context'

interface WorkOrderFormModalProps {
  open: boolean
  onClose: () => void
  /** Edit this work order; create a new one when absent. */
  workOrder?: WorkOrder
  /** Preselected asset when creating from an asset page. */
  assetId?: string
}

interface FormState {
  title: string
  description: string
  assetId: string
  type: WorkOrderInput['type']
  priority: WorkOrderInput['priority']
  assigneeId: string
  dueDate: string
  estimatedHours: string
  checklist: string
}

function initialState(workOrder: WorkOrder | undefined, assetId: string | undefined): FormState {
  const inThreeDays = new Date()
  inThreeDays.setDate(inThreeDays.getDate() + 3)
  return {
    title: workOrder?.title ?? '',
    description: workOrder?.description ?? '',
    assetId: workOrder?.assetId ?? assetId ?? '',
    type: workOrder?.type ?? 'corrective',
    priority: workOrder?.priority ?? 'medium',
    assigneeId: workOrder?.assigneeId ?? '',
    dueDate: workOrder?.dueDate ?? toIsoDate(inThreeDays),
    estimatedHours: workOrder ? String(workOrder.estimatedHours) : '2',
    checklist: '',
  }
}

export function WorkOrderFormModal({ open, onClose, workOrder, assetId }: WorkOrderFormModalProps) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={workOrder ? t('form.editTitle', { code: workOrder.code }) : t('form.newTitle')}
      description={workOrder ? undefined : t('form.newDescription')}
    >
      {/* Remounted on every open so the form starts fresh. */}
      {open && <WorkOrderForm workOrder={workOrder} assetId={assetId} onDone={onClose} />}
    </Modal>
  )
}

function WorkOrderForm({
  workOrder,
  assetId,
  onDone,
}: {
  workOrder?: WorkOrder
  assetId?: string
  onDone: () => void
}) {
  const { t } = useI18n()
  const toast = useToast()
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const { can } = useSession()
  const { data: assets = [] } = useAssets()
  const { data: users = [] } = useUsers()
  const create = useCreateWorkOrder()
  const update = useUpdateWorkOrder()
  const [form, setForm] = useState(() => initialState(workOrder, assetId))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const technicians = users.filter((u) => u.role === 'technician')
  const canAssign = can('workOrder.assign')
  const pending = create.isPending || update.isPending
  // Work in progress keeps its assignee: the server refuses to unassign it.
  const assigneeLocked = workOrder?.status === 'in_progress' || workOrder?.status === 'done'

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = workOrderInputSchema.safeParse({
      ...form,
      assigneeId: form.assigneeId || null,
      estimatedHours: form.estimatedHours === '' ? Number.NaN : Number(form.estimatedHours.replace(',', '.')),
      checklist: form.checklist
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    })
    if (!result.success) {
      setErrors(fieldErrors(result.error))
      return
    }
    setErrors({})
    try {
      if (workOrder) {
        // The patch schema drops the checklist: progress is kept, items are toggled one by one.
        await update.mutateAsync({ id: workOrder.id, patch: workOrderPatchSchema.parse(result.data) })
        toast(t('toast.updated', { code: workOrder.code }))
      } else {
        const created = await create.mutateAsync(result.data)
        toast(t('toast.created', { code: created.code }))
        navigate(`/work-orders/${created.id}`)
      }
      onDone()
    } catch (error) {
      toast(errorMessage(error), 'error')
    }
  }

  const error = (key: keyof FormState) => (errors[key] ? t(formErrorKey(errors[key])) : undefined)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label={t('form.title')} error={error('title')}>
        {(props) => (
          <Input
            {...props}
            value={form.title}
            onChange={(e) => set('title')(e.target.value)}
            placeholder={t('form.titlePlaceholder')}
            autoFocus
          />
        )}
      </Field>

      <Field label={t('form.asset')} error={error('assetId')}>
        {(props) => (
          <Select {...props} value={form.assetId} onChange={(e) => set('assetId')(e.target.value)}>
            <option value="" disabled>
              {t('form.assetPlaceholder')}
            </option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.tag} · {asset.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('form.type')}>
          {(props) => (
            <Select {...props} value={form.type} onChange={(e) => set('type')(e.target.value as FormState['type'])}>
              {WORK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`type.${type}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('form.priority')}>
          {(props) => (
            <Select
              {...props}
              value={form.priority}
              onChange={(e) => set('priority')(e.target.value as FormState['priority'])}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(`priority.${priority}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('form.dueDate')} error={error('dueDate')}>
          {(props) => (
            <Input {...props} type="date" value={form.dueDate} onChange={(e) => set('dueDate')(e.target.value)} />
          )}
        </Field>
        <Field label={t('form.estimate')} error={error('estimatedHours')}>
          {(props) => (
            <Input
              {...props}
              inputMode="decimal"
              value={form.estimatedHours}
              onChange={(e) => set('estimatedHours')(e.target.value)}
            />
          )}
        </Field>
      </div>

      {canAssign && (
        <Field label={t('form.assignee')} hint={assigneeLocked ? t('form.assigneeLocked') : t('form.assigneeHint')}>
          {(props) => (
            <Select {...props} value={form.assigneeId} onChange={(e) => set('assigneeId')(e.target.value)}>
              <option value="" disabled={assigneeLocked}>
                {t('common.unassigned')}
              </option>
              {technicians.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {t(`trade.${user.trade}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field label={t('form.description')} error={error('description')}>
        {(props) => (
          <Textarea {...props} rows={3} value={form.description} onChange={(e) => set('description')(e.target.value)} />
        )}
      </Field>

      {!workOrder && (
        <Field label={t('form.checklist')} hint={t('form.checklistHint')}>
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              value={form.checklist}
              onChange={(e) => set('checklist')(e.target.value)}
              placeholder={t('form.checklistPlaceholder')}
            />
          )}
        </Field>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onDone}>{t('common.cancel')}</Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {workOrder ? t('common.save') : t('form.create')}
        </Button>
      </div>
    </form>
  )
}
