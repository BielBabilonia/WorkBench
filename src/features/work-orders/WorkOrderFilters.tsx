import { PRIORITIES, type User } from '../../api/schemas'
import { Input, Select } from '../../components/ui/Field'
import { SearchIcon } from '../../components/ui/icons'
import { useI18n } from '../../i18n/i18n-context'
import type { Filters } from './filters'

interface WorkOrderFiltersProps {
  filters: Filters
  onChange: (next: Partial<Filters>) => void
  users: readonly User[]
}

export function WorkOrderFilters({ filters, onChange, users }: WorkOrderFiltersProps) {
  const { t } = useI18n()
  const technicians = users.filter((u) => u.role === 'technician')
  return (
    <div role="search" className="mb-4 flex flex-col gap-2 sm:flex-row print:hidden">
      <div className="relative sm:max-w-xs sm:flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
        <Input
          type="search"
          aria-label={t('filters.search')}
          placeholder={t('filters.search')}
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          className="pl-9"
        />
      </div>
      <Select
        aria-label={t('filters.assignee')}
        value={filters.assignee}
        onChange={(e) => onChange({ assignee: e.target.value })}
        className="sm:w-48"
      >
        <option value="all">{t('filters.anyone')}</option>
        <option value="me">{t('filters.me')}</option>
        <option value="none">{t('common.unassigned')}</option>
        {technicians.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t('filters.priority')}
        value={filters.priority}
        onChange={(e) => onChange({ priority: e.target.value as Filters['priority'] })}
        className="sm:w-44"
      >
        <option value="all">{t('filters.anyPriority')}</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {t(`priority.${priority}`)}
          </option>
        ))}
      </Select>
    </div>
  )
}
