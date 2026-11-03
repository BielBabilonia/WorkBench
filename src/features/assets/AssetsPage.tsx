import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAssets, useCreateAsset } from '../../api/queries'
import { assetInputSchema, CRITICALITIES, type AssetInput } from '../../api/schemas'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Select } from '../../components/ui/Field'
import { PlusIcon } from '../../components/ui/icons'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast-context'
import { useI18n } from '../../i18n/i18n-context'
import { useErrorMessage } from '../../i18n/use-error-message'
import { fieldErrors, formErrorKey } from '../../lib/form-errors'
import { useDocumentTitle } from '../../lib/use-document-title'
import { useSession } from '../../session/session-context'
import { AssetStateBadge } from '../work-orders/badges'

export function AssetsPage() {
  const { t } = useI18n()
  useDocumentTitle(t('nav.assets'))
  const { can } = useSession()
  const assets = useAssets()
  const [creating, setCreating] = useState(false)

  return (
    <div>
      <PageHeader
        title={t('assets.title')}
        actions={
          can('asset.manage') && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <PlusIcon />
              {t('assets.new')}
            </Button>
          )
        }
      />

      {assets.isError ? (
        <ErrorState onRetry={() => assets.refetch()} />
      ) : assets.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : assets.data.length === 0 ? (
        <EmptyState title={t('assets.emptyTitle')} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.data.map((asset) => (
            <li key={asset.id}>
              <Card className="relative h-full p-4 transition-colors hover:border-border-strong">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/assets/${asset.id}`}
                    className="font-mono text-sm font-semibold after:absolute after:inset-0 hover:underline"
                  >
                    {asset.tag}
                  </Link>
                  <AssetStateBadge state={asset.state} />
                </div>
                <p className="mt-1 text-sm text-fg">{asset.name}</p>
                <dl className="mt-3 flex gap-4 text-xs text-muted">
                  <div>
                    <dt className="sr-only">{t('assets.location')}</dt>
                    <dd>{asset.location}</dd>
                  </div>
                  <div>
                    <dt className="inline">{t('assets.criticality')}: </dt>
                    <dd className="inline font-medium text-fg" title={t(`criticality.${asset.criticality}`)}>
                      {asset.criticality}
                    </dd>
                  </div>
                  <div className="ml-auto">
                    <dt className="sr-only">{t('assets.openWork')}</dt>
                    <dd>{t('assets.openCount', { count: asset.openWorkOrders })}</dd>
                  </div>
                </dl>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title={t('assets.newTitle')}>
        {creating && <AssetForm onDone={() => setCreating(false)} />}
      </Modal>
    </div>
  )
}

function AssetForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const errorMessage = useErrorMessage()
  const create = useCreateAsset()
  const [form, setForm] = useState<AssetInput>({ tag: '', name: '', location: '', criticality: 'B' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (key: keyof AssetInput) => (value: string) => setForm((current) => ({ ...current, [key]: value }))
  const error = (key: keyof AssetInput) => (errors[key] ? t(formErrorKey(errors[key])) : undefined)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = assetInputSchema.safeParse(form)
    if (!result.success) {
      setErrors(fieldErrors(result.error))
      return
    }
    setErrors({})
    try {
      const asset = await create.mutateAsync(result.data)
      toast(t('toast.assetCreated', { tag: asset.tag }))
      onDone()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
        <Field label={t('assets.tag')} hint={t('assets.tagHint')} error={error('tag')}>
          {(props) => (
            <Input
              {...props}
              value={form.tag}
              onChange={(e) => set('tag')(e.target.value)}
              placeholder="PMP-202"
              className="font-mono uppercase"
              autoFocus
            />
          )}
        </Field>
        <Field label={t('assets.name')} error={error('name')}>
          {(props) => <Input {...props} value={form.name} onChange={(e) => set('name')(e.target.value)} />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('assets.location')} error={error('location')}>
          {(props) => <Input {...props} value={form.location} onChange={(e) => set('location')(e.target.value)} />}
        </Field>
        <Field label={t('assets.criticality')}>
          {(props) => (
            <Select {...props} value={form.criticality} onChange={(e) => set('criticality')(e.target.value)}>
              {CRITICALITIES.map((c) => (
                <option key={c} value={c}>
                  {c} · {t(`criticality.${c}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onDone}>{t('common.cancel')}</Button>
        <Button type="submit" variant="primary" disabled={create.isPending}>
          {t('assets.create')}
        </Button>
      </div>
    </form>
  )
}
