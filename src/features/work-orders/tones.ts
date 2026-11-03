import type { AssetState, Priority, WorkOrderStatus } from '../../api/schemas'
import type { Tone } from '../../components/ui/Badge'

export const STATUS_TONE: Record<WorkOrderStatus, Tone> = {
  open: 'neutral',
  scheduled: 'info',
  in_progress: 'warning',
  on_hold: 'danger',
  done: 'success',
}

export const PRIORITY_TONE: Record<Priority, Tone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
}

export const ASSET_STATE_TONE: Record<AssetState, Tone> = {
  running: 'success',
  maintenance: 'warning',
  down: 'danger',
}
