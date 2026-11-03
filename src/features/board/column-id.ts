import type { WorkOrderStatus } from '../../api/schemas'

/** Droppable id of a board column; card ids are work order ids. */
export const columnId = (status: WorkOrderStatus) => `column:${status}`
