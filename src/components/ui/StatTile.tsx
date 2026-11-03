import type { ReactNode } from 'react'
import { Skeleton } from './Skeleton'

/** A row of numbers in one bordered strip. Children are <StatTile>s. */
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
      {children}
    </dl>
  )
}

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
}

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-subtle">{hint}</dd>}
    </div>
  )
}

export function StatTileSkeleton() {
  return (
    <div className="bg-surface px-4 py-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-2 h-7 w-12" />
    </div>
  )
}
