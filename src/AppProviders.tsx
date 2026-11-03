import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { createQueryClient } from './api/queries'
import { ToastProvider } from './components/ui/ToastProvider'
import { I18nProvider } from './i18n/I18nProvider'
import type { Locale } from './i18n/i18n-context'
import { SessionProvider } from './session/SessionProvider'
import { ThemeProvider } from './theme/ThemeProvider'

interface AppProvidersProps {
  children: ReactNode
  /** Overrides for tests. */
  queryClient?: QueryClient
  locale?: Locale
  userId?: string
}

export function AppProviders({ children, queryClient: injected, locale, userId }: AppProvidersProps) {
  const [queryClient] = useState(() => injected ?? createQueryClient())
  return (
    <ThemeProvider>
      <I18nProvider locale={locale}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider userId={userId}>
            <ToastProvider>{children}</ToastProvider>
          </SessionProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
