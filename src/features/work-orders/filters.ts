import { useSearchParams } from 'react-router-dom'
import { PRIORITIES, type Asset, type Priority, type User, type WorkOrder } from '../../api/schemas'

export interface Filters {
  q: string
  /** "all", "me", "none" (unassigned) or a user id. */
  assignee: string
  priority: Priority | 'all'
}

/** Filters live in the URL, so a filtered board can be shared or bookmarked. */
export function useWorkOrderFilters(): [Filters, (next: Partial<Filters>) => void] {
  const [params, setParams] = useSearchParams()
  const priority = params.get('priority')
  const filters: Filters = {
    q: params.get('q') ?? '',
    assignee: params.get('assignee') ?? 'all',
    priority: PRIORITIES.includes(priority as Priority) ? (priority as Priority) : 'all',
  }
  const update = (next: Partial<Filters>) =>
    setParams(
      (current) => {
        const result = new URLSearchParams(current)
        for (const [key, value] of Object.entries(next)) {
          if (!value || value === 'all') result.delete(key)
          else result.set(key, value)
        }
        return result
      },
      { replace: true },
    )
  return [filters, update]
}

export function matchesFilters(workOrder: WorkOrder, filters: Filters, me: User, asset: Asset | undefined) {
  const { q, assignee, priority } = filters
  if (priority !== 'all' && workOrder.priority !== priority) return false
  if (assignee === 'me' && workOrder.assigneeId !== me.id) return false
  if (assignee === 'none' && workOrder.assigneeId !== null) return false
  if (!['all', 'me', 'none'].includes(assignee) && workOrder.assigneeId !== assignee) return false
  const query = q.trim().toLowerCase()
  if (!query) return true
  return [workOrder.code, workOrder.title, asset?.tag ?? '', asset?.name ?? ''].some((text) =>
    text.toLowerCase().includes(query),
  )
}
