import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applyMove } from '../lib/workflow'
import { ApiError, api } from './client'
import type {
  AssetInput,
  MoveInput,
  UserPatch,
  WorkOrder,
  WorkOrderDetail,
  WorkOrderInput,
  WorkOrderPatch,
} from './schemas'

/** Several people work on the same board: poll so their changes show up. */
export const POLL_INTERVAL_MS = 15_000

export const queryKeys = {
  all: ['workbench'] as const,
  users: () => [...queryKeys.all, 'users'] as const,
  assets: () => [...queryKeys.all, 'assets'] as const,
  assetList: () => [...queryKeys.assets(), 'list'] as const,
  asset: (id: string) => [...queryKeys.assets(), 'detail', id] as const,
  workOrders: () => [...queryKeys.all, 'work-orders'] as const,
  workOrderList: () => [...queryKeys.workOrders(), 'list'] as const,
  workOrder: (id: string) => [...queryKeys.workOrders(), 'detail', id] as const,
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        // Retrying a 404 or 403 only delays the error screen.
        retry: (count, error) =>
          !(error instanceof ApiError && (error.status === 404 || error.status === 403)) && count < 2,
      },
    },
  })
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users(), queryFn: api.listUsers, staleTime: 60_000 })
}

export function useAssets() {
  return useQuery({ queryKey: queryKeys.assetList(), queryFn: api.listAssets })
}

export function useAsset(id: string) {
  return useQuery({ queryKey: queryKeys.asset(id), queryFn: () => api.getAsset(id) })
}

export function useWorkOrders() {
  return useQuery({
    queryKey: queryKeys.workOrderList(),
    queryFn: api.listWorkOrders,
    refetchInterval: POLL_INTERVAL_MS,
  })
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.workOrder(id),
    queryFn: () => api.getWorkOrder(id),
    refetchInterval: POLL_INTERVAL_MS,
  })
}

/** Work orders feed asset state and counts, so every change refreshes both. */
function useInvalidateWork() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.workOrders() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.assets() }),
    ])
}

export function useCreateWorkOrder() {
  const invalidate = useInvalidateWork()
  return useMutation({
    mutationFn: (input: WorkOrderInput) => api.createWorkOrder(input),
    onSettled: invalidate,
  })
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateWork()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: WorkOrderPatch }) => api.updateWorkOrder(id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData<WorkOrderDetail>(queryKeys.workOrder(updated.id), (detail) =>
        detail ? { ...detail, ...updated } : detail,
      )
    },
    onSettled: invalidate,
  })
}

/**
 * Optimistic: the card lands in its new column right away and goes back if the
 * server refuses (permissions, checklist incomplete, ...).
 */
export function useMoveWorkOrder() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateWork()
  return useMutation({
    mutationFn: ({ id, move }: { id: string; move: MoveInput }) => api.moveWorkOrder(id, move),
    onMutate: async ({ id, move }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workOrders() })
      const list = queryClient.getQueryData<WorkOrder[]>(queryKeys.workOrderList())
      const detail = queryClient.getQueryData<WorkOrderDetail>(queryKeys.workOrder(id))
      queryClient.setQueryData<WorkOrder[]>(queryKeys.workOrderList(), (current) =>
        current ? applyMove(current, id, move.status, move.index) : current,
      )
      queryClient.setQueryData<WorkOrderDetail>(queryKeys.workOrder(id), (current) =>
        current ? { ...current, status: move.status } : current,
      )
      return { list, detail }
    },
    onError: (_error, { id }, snapshot) => {
      queryClient.setQueryData(queryKeys.workOrderList(), snapshot?.list)
      queryClient.setQueryData(queryKeys.workOrder(id), snapshot?.detail)
    },
    onSettled: invalidate,
  })
}

export function useToggleChecklistItem(workOrderId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateWork()
  return useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      api.toggleChecklistItem(workOrderId, itemId, done),
    onMutate: async ({ itemId, done }) => {
      const key = queryKeys.workOrder(workOrderId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<WorkOrderDetail>(key)
      queryClient.setQueryData<WorkOrderDetail>(key, (detail) =>
        detail
          ? { ...detail, checklist: detail.checklist.map((c) => (c.id === itemId ? { ...c, done } : c)) }
          : detail,
      )
      return { previous }
    },
    onError: (_error, _variables, snapshot) =>
      queryClient.setQueryData(queryKeys.workOrder(workOrderId), snapshot?.previous),
    onSettled: invalidate,
  })
}

export function useAddComment(workOrderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => api.addComment(workOrderId, { text }),
    onSuccess: (activity) => {
      queryClient.setQueryData<WorkOrderDetail>(queryKeys.workOrder(workOrderId), (detail) =>
        detail ? { ...detail, activity: [...detail.activity, activity] } : detail,
      )
    },
  })
}

export function useDeleteWorkOrder() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateWork()
  return useMutation({
    mutationFn: (id: string) => api.deleteWorkOrder(id),
    onSuccess: (_data, id) => queryClient.removeQueries({ queryKey: queryKeys.workOrder(id) }),
    onSettled: invalidate,
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AssetInput) => api.createAsset(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.assets() }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateWork()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UserPatch }) => api.updateUser(id, patch),
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.users() }), invalidate()]),
  })
}

export function useResetDemo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.resetDemo,
    onSuccess: () => queryClient.resetQueries({ queryKey: queryKeys.all }),
  })
}
