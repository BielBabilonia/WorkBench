import { useUpdateUser, useUsers, useWorkOrders } from '../../api/queries'
import { ROLES, type Role } from '../../api/schemas'
import { Avatar } from '../../components/ui/Avatar'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast-context'
import { useI18n } from '../../i18n/i18n-context'
import { useErrorMessage } from '../../i18n/use-error-message'
import { hasPermission, type Permission } from '../../lib/permissions'
import { useDocumentTitle } from '../../lib/use-document-title'

/** Shown as the permission matrix under the user list. */
const MATRIX: Permission[] = [
  'workOrder.create',
  'workOrder.edit',
  'workOrder.assign',
  'workOrder.moveAny',
  'workOrder.moveOwn',
  'workOrder.comment',
  'workOrder.delete',
  'asset.manage',
  'user.manage',
]

export function UsersPage() {
  const { t } = useI18n()
  useDocumentTitle(t('nav.users'))
  const toast = useToast()
  const errorMessage = useErrorMessage()
  const users = useUsers()
  const { data: workOrders = [] } = useWorkOrders()
  const update = useUpdateUser()

  function changeRole(id: string, name: string, role: Role) {
    update.mutate(
      { id, patch: { role } },
      {
        onSuccess: () => toast(t('toast.roleChanged', { name, role: t(`role.${role}`) })),
        onError: (error) => toast(errorMessage(error), 'error'),
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('users.title')} />

      <Card className="overflow-hidden">
        {users.isError ? (
          <ErrorState onRetry={() => users.refetch()} />
        ) : users.isPending ? (
          <div className="space-y-3 p-5" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {t('users.col.name')}
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    {t('users.col.trade')}
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
                    {t('users.col.open')}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {t('users.col.role')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.data.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar user={user} />
                        <span className="min-w-0">
                          <span className="block font-medium">{user.name}</span>
                          <span className="block truncate text-xs text-muted">{user.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{t(`trade.${user.trade}`)}</td>
                    <td className="hidden px-4 py-3 tabular-nums md:table-cell">
                      {workOrders.filter((wo) => wo.assigneeId === user.id && wo.status !== 'done').length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-36">
                        <Select
                          aria-label={t('users.roleFor', { name: user.name })}
                          value={user.role}
                          disabled={update.isPending}
                          onChange={(e) => changeRole(user.id, user.name, e.target.value as Role)}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {t(`role.${role}`)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 pt-5">
          <h2 className="text-base font-semibold">{t('users.matrix')}</h2>
          <p className="mt-0.5 text-sm text-muted">{t('users.matrixHint')}</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-border bg-surface-muted/50 text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">
                  {t('users.permission')}
                </th>
                {ROLES.map((role) => (
                  <th key={role} scope="col" className="px-4 py-2.5 text-center font-medium">
                    {t(`role.${role}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MATRIX.map((permission) => (
                <tr key={permission}>
                  <th scope="row" className="px-4 py-2.5 text-left font-normal">
                    {t(`permission.${permission}`)}
                  </th>
                  {ROLES.map((role) => {
                    const granted = hasPermission(role, permission)
                    return (
                      <td key={role} className="px-4 py-2.5 text-center">
                        <span aria-hidden className={granted ? 'text-success-fg' : 'text-subtle'}>
                          {granted ? '●' : '–'}
                        </span>
                        <span className="sr-only">{granted ? t('users.granted') : t('users.denied')}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
