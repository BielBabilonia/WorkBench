import type {
  Activity,
  ChecklistItem,
  Criticality,
  Priority,
  User,
  WorkOrder,
  WorkOrderStatus,
  WorkType,
} from '../api/schemas'
import { toIsoDate } from '../lib/workflow'

/** Stored asset: state and open count are derived on read. */
export interface AssetRecord {
  id: string
  tag: string
  name: string
  location: string
  criticality: Criticality
}

export interface DbState {
  users: User[]
  assets: AssetRecord[]
  workOrders: WorkOrder[]
  activity: Activity[]
  nextCode: number
  nextId: number
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** Small seeded PRNG (mulberry32): the demo looks the same on every load. */
function createRandom(seed: number) {
  let a = seed
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  }
}

export const DEMO_USERS: User[] = [
  { id: 'u-marina', name: 'Marina Costa', email: 'marina@workbench.demo', role: 'admin', trade: 'general' },
  { id: 'u-rafael', name: 'Rafael Lima', email: 'rafael@workbench.demo', role: 'planner', trade: 'mechanical' },
  { id: 'u-joao', name: 'João Pereira', email: 'joao@workbench.demo', role: 'technician', trade: 'mechanical' },
  { id: 'u-aisha', name: 'Aisha Bello', email: 'aisha@workbench.demo', role: 'technician', trade: 'electrical' },
  { id: 'u-lucas', name: 'Lucas Martins', email: 'lucas@workbench.demo', role: 'technician', trade: 'instrumentation' },
  { id: 'u-sofia', name: 'Sofia Almeida', email: 'sofia@workbench.demo', role: 'technician', trade: 'mechanical' },
  { id: 'u-daniel', name: 'Daniel Ortiz', email: 'daniel@workbench.demo', role: 'viewer', trade: 'general' },
]

const ASSETS: AssetRecord[] = [
  { id: 'a-cmp101', tag: 'CMP-101', name: 'Screw air compressor #1', location: 'Utilities', criticality: 'A' },
  { id: 'a-cmp102', tag: 'CMP-102', name: 'Screw air compressor #2', location: 'Utilities', criticality: 'B' },
  { id: 'a-pmp201', tag: 'PMP-201', name: 'Cooling water pump', location: 'Utilities', criticality: 'A' },
  { id: 'a-blr501', tag: 'BLR-501', name: 'Steam boiler', location: 'Utilities', criticality: 'A' },
  { id: 'a-cnc401', tag: 'CNC-401', name: '5-axis milling center', location: 'Machining', criticality: 'A' },
  { id: 'a-rbt410', tag: 'RBT-410', name: 'Welding robot cell', location: 'Line 1', criticality: 'A' },
  { id: 'a-cnv301', tag: 'CNV-301', name: 'Packaging conveyor', location: 'Line 2', criticality: 'B' },
  { id: 'a-prs801', tag: 'PRS-801', name: 'Hydraulic press 400 t', location: 'Stamping', criticality: 'A' },
  { id: 'a-flt701', tag: 'FLT-701', name: 'Electric forklift #3', location: 'Warehouse', criticality: 'C' },
  { id: 'a-gen901', tag: 'GEN-901', name: 'Backup diesel generator', location: 'Utilities', criticality: 'B' },
  { id: 'a-hvc601', tag: 'HVC-601', name: 'Rooftop HVAC unit', location: 'Building', criticality: 'C' },
]

interface Template {
  type: WorkType
  title: string
  description: string
  hours: number
  checklist: string[]
  /** Asset tags this job makes sense for. */
  assets: string[]
}

const TEMPLATES: Template[] = [
  {
    type: 'corrective',
    title: 'Air leak at discharge valve',
    description: 'Operators report a hissing noise near the discharge valve and pressure dropping faster than usual.',
    hours: 3,
    checklist: [
      'Isolate and depressurize',
      'Locate leak with soap test',
      'Replace valve seal',
      'Leak test at working pressure',
    ],
    assets: ['CMP-101', 'CMP-102'],
  },
  {
    type: 'corrective',
    title: 'Abnormal vibration on motor bearing',
    description: 'Vibration on the drive-end bearing went from 2.1 to 6.8 mm/s in a week.',
    hours: 6,
    checklist: ['Lockout / tagout', 'Check alignment', 'Replace drive-end bearing', 'Measure vibration after start-up'],
    assets: ['PMP-201', 'CMP-101', 'CNV-301'],
  },
  {
    type: 'corrective',
    title: 'Conveyor belt tracking off-center',
    description: 'Belt drifts to the left side and rubs the frame at the tail pulley.',
    hours: 2,
    checklist: ['Stop and lock the line', 'Adjust tail pulley', 'Run empty for 10 minutes'],
    assets: ['CNV-301'],
  },
  {
    type: 'corrective',
    title: 'Hydraulic oil leak on main cylinder',
    description: 'Oil on the floor under the main cylinder; level dropped 5 L since last shift.',
    hours: 8,
    checklist: [
      'Lower ram and lock out',
      'Replace cylinder rod seals',
      'Top up and bleed the circuit',
      'Test at full tonnage',
    ],
    assets: ['PRS-801'],
  },
  {
    type: 'corrective',
    title: 'Spindle overheating alarm',
    description: 'Alarm 2041 (spindle temperature) during long roughing cycles.',
    hours: 4,
    checklist: ['Check chiller flow and setpoint', 'Clean heat exchanger', 'Run warm-up cycle and monitor'],
    assets: ['CNC-401'],
  },
  {
    type: 'corrective',
    title: 'Burner fails to ignite',
    description: 'Flame failure lockout on cold start, three times this week.',
    hours: 5,
    checklist: ['Inspect ignition electrode', 'Check flame scanner', 'Combustion analysis after repair'],
    assets: ['BLR-501'],
  },
  {
    type: 'corrective',
    title: 'Torch collision sensor fault',
    description: 'Cell stops with a collision fault without any contact. Suspect damaged cable.',
    hours: 3,
    checklist: ['Inspect torch cable', 'Replace collision sensor', 'Re-teach TCP'],
    assets: ['RBT-410'],
  },
  {
    type: 'corrective',
    title: 'Pressure transmitter reading drift',
    description: 'Transmitter reads 0.4 bar above the local gauge.',
    hours: 2,
    checklist: ['Compare with calibrated gauge', 'Recalibrate or replace transmitter', 'Update calibration record'],
    assets: ['PMP-201', 'BLR-501', 'CMP-102'],
  },
  {
    type: 'preventive',
    title: 'Quarterly lubrication',
    description: 'Lubrication route as per the manufacturer schedule.',
    hours: 2,
    checklist: ['Grease bearings', 'Check oil levels', 'Record consumption'],
    assets: ['CNV-301', 'PMP-201', 'CNC-401', 'PRS-801'],
  },
  {
    type: 'preventive',
    title: 'Replace air intake filters',
    description: 'Scheduled filter replacement.',
    hours: 1,
    checklist: ['Replace intake filter', 'Reset service counter'],
    assets: ['CMP-101', 'CMP-102', 'HVC-601', 'GEN-901'],
  },
  {
    type: 'preventive',
    title: 'Oil and filter change (2,000 h)',
    description: 'Service at 2,000 running hours.',
    hours: 3,
    checklist: ['Drain oil', 'Replace oil filter', 'Refill and check for leaks', 'Reset service counter'],
    assets: ['CMP-101', 'CMP-102', 'GEN-901'],
  },
  {
    type: 'preventive',
    title: 'Monthly safety valve test',
    description: 'Lift test of the safety valve, required by the pressure vessel program.',
    hours: 1,
    checklist: ['Lift test', 'Record set pressure', 'Seal and tag'],
    assets: ['BLR-501', 'CMP-101'],
  },
  {
    type: 'preventive',
    title: 'Battery load test',
    description: 'Load test and electrolyte check.',
    hours: 1.5,
    checklist: ['Load test', 'Clean terminals', 'Record results'],
    assets: ['FLT-701', 'GEN-901'],
  },
  {
    type: 'inspection',
    title: 'Thermographic inspection of electrical panel',
    description: 'Infrared scan of the main panel under load.',
    hours: 2,
    checklist: ['Open panel under supervision', 'Scan breakers and busbars', 'Report hot spots'],
    assets: ['CNC-401', 'RBT-410', 'PRS-801', 'HVC-601'],
  },
  {
    type: 'inspection',
    title: 'Vibration analysis route',
    description: 'Monthly vibration readings for the predictive program.',
    hours: 2,
    checklist: ['Collect readings', 'Compare with baseline', 'Flag assets above alarm level'],
    assets: ['PMP-201', 'CMP-101', 'CMP-102'],
  },
  {
    type: 'inspection',
    title: 'Weekly walkdown inspection',
    description: 'Visual check: leaks, guards, noise, housekeeping.',
    hours: 1,
    checklist: ['Check guards and e-stops', 'Look for leaks', 'Note abnormal noise'],
    assets: ['CNV-301', 'RBT-410', 'FLT-701', 'PRS-801'],
  },
]

const COMMENTS = [
  'Spare part ordered, arriving Thursday.',
  'Checked with the operator: issue started after the last shift change.',
  'Need a second person for the lockout on this one.',
  'Found the root cause, the old gasket was cracked.',
  'Production asked to wait until the end of the batch.',
  'Photos attached to the asset record.',
]

/** How many seeded jobs end up in each column. */
const STATUS_PLAN: [WorkOrderStatus, number][] = [
  ['done', 16],
  ['open', 6],
  ['scheduled', 7],
  ['in_progress', 5],
  ['on_hold', 4],
]

const PRIORITY_WEIGHTS: Priority[] = ['low', 'medium', 'medium', 'medium', 'high', 'high', 'critical']

export function createSeed(now = Date.now()): DbState {
  const random = createRandom(42)
  const technicians = DEMO_USERS.filter((u) => u.role === 'technician')
  const planners = DEMO_USERS.filter((u) => u.role === 'planner' || u.role === 'admin')
  const workOrders: WorkOrder[] = []
  const activity: Activity[] = []
  let nextId = 1
  let code = 1001
  const id = (prefix: string) => `${prefix}-${nextId++}`
  const iso = (t: number) => new Date(Math.round(t / 60_000) * 60_000).toISOString()

  const log = (entry: Omit<Activity, 'id' | 'from' | 'to' | 'text'> & Partial<Activity>) =>
    activity.push({ id: id('act'), from: null, to: null, text: null, ...entry })

  for (const [status, count] of STATUS_PLAN) {
    for (let i = 0; i < count; i++) {
      // The first open job is a breakdown, so one asset shows as down.
      const breakdown = status === 'open' && i === 0
      const template = breakdown
        ? TEMPLATES.find((t) => t.title === 'Hydraulic oil leak on main cylinder')!
        : random.pick(TEMPLATES)
      const tag = random.pick(template.assets)
      const asset = ASSETS.find((a) => a.tag === tag)!
      const priority: Priority = breakdown
        ? 'critical'
        : template.type === 'corrective'
          ? random.pick(PRIORITY_WEIGHTS)
          : random.pick<Priority>(['low', 'medium', 'medium'])
      // Done jobs spread over the last 30 days; the rest were opened recently.
      const createdAt = status === 'done' ? now - random.int(3, 30) * DAY : now - random.int(2, 240) * HOUR
      // Round-robin keeps the workload chart believable; triage jobs are mostly unassigned.
      const assignee =
        status === 'open' && random.next() < 0.7 ? null : technicians[workOrders.length % technicians.length]
      const creator = random.pick(planners)
      const checklist: ChecklistItem[] = template.checklist.map((label, index) => ({
        id: id('chk'),
        label,
        done:
          status === 'done' ||
          (status === 'in_progress' && index < Math.ceil(template.checklist.length / 2)) ||
          (status === 'on_hold' && index === 0),
      }))
      // Open work is due in the coming days; a few late jobs make the overdue counter meaningful.
      const due =
        status === 'done'
          ? new Date(createdAt + random.int(1, 10) * DAY)
          : new Date(now + (random.next() < 0.2 ? -random.int(1, 4) : random.int(0, 10)) * DAY)
      const repairHours = template.type === 'corrective' ? random.int(4, 60) : random.int(24, 96)
      const completedAt = status === 'done' ? Math.min(now - HOUR, createdAt + repairHours * HOUR) : null

      const workOrder: WorkOrder = {
        id: id('wo'),
        code: `WO-${code++}`,
        title: template.title,
        description: template.description,
        assetId: asset.id,
        type: template.type,
        priority,
        status,
        assigneeId: assignee?.id ?? null,
        dueDate: toIsoDate(due),
        estimatedHours: template.hours,
        checklist,
        position: i,
        createdAt: iso(createdAt),
        createdById: creator.id,
        completedAt: completedAt ? iso(completedAt) : null,
      }
      workOrders.push(workOrder)

      const end = completedAt ?? now - 30 * 60_000
      const step = (end - createdAt) / 4
      log({ workOrderId: workOrder.id, at: iso(createdAt), actorId: creator.id, kind: 'created' })
      if (assignee) {
        log({
          workOrderId: workOrder.id,
          at: iso(createdAt + step * 0.3),
          actorId: creator.id,
          kind: 'assigned',
          to: assignee.id,
        })
      }
      const path: WorkOrderStatus[] = {
        open: [],
        scheduled: ['scheduled'],
        in_progress: ['scheduled', 'in_progress'],
        on_hold: ['scheduled', 'in_progress', 'on_hold'],
        done: ['scheduled', 'in_progress', 'done'],
      }[status] as WorkOrderStatus[]
      let previous: WorkOrderStatus = 'open'
      path.forEach((next, index) => {
        const at = next === 'done' ? end : createdAt + step * (index + 1)
        log({
          workOrderId: workOrder.id,
          at: iso(at),
          actorId: next === 'scheduled' ? creator.id : (assignee?.id ?? creator.id),
          kind: 'status',
          from: previous,
          to: next,
        })
        if (index === 0 && random.next() < 0.5) {
          log({
            workOrderId: workOrder.id,
            at: iso(at + step * 0.5),
            actorId: assignee?.id ?? creator.id,
            kind: 'comment',
            text: random.pick(COMMENTS),
          })
        }
        previous = next
      })
    }
  }

  return {
    users: DEMO_USERS.map((u) => ({ ...u })),
    assets: ASSETS.map((a) => ({ ...a })),
    workOrders,
    activity,
    nextCode: code,
    nextId,
  }
}
