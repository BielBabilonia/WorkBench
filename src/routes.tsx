import type { RouteObject } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { NotFoundPage } from './components/layout/NotFoundPage'
import { PageFallback } from './components/layout/PageFallback'
import { RequirePermission } from './components/layout/RequirePermission'
import { ROUTE_PERMISSIONS } from './lib/permissions'

// Pages are code-split; dnd-kit only loads with the board.
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    hydrateFallbackElement: <PageFallback />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('./features/dashboard/DashboardPage')).DashboardPage }),
      },
      {
        path: 'board',
        lazy: async () => ({ Component: (await import('./features/board/BoardPage')).BoardPage }),
      },
      {
        path: 'work-orders',
        lazy: async () => ({ Component: (await import('./features/work-orders/WorkOrdersPage')).WorkOrdersPage }),
      },
      {
        path: 'work-orders/:id',
        lazy: async () => ({
          Component: (await import('./features/work-orders/WorkOrderDetailPage')).WorkOrderDetailPage,
        }),
      },
      {
        path: 'assets',
        lazy: async () => ({ Component: (await import('./features/assets/AssetsPage')).AssetsPage }),
      },
      {
        path: 'assets/:id',
        lazy: async () => ({ Component: (await import('./features/assets/AssetDetailPage')).AssetDetailPage }),
      },
      {
        path: 'users',
        lazy: async () => {
          const { UsersPage } = await import('./features/users/UsersPage')
          return {
            Component: () => (
              <RequirePermission permission={ROUTE_PERMISSIONS.users}>
                <UsersPage />
              </RequirePermission>
            ),
          }
        },
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]
