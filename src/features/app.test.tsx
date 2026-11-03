import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '../mocks/db'
import { renderApp } from '../test/render'

describe('dashboard', () => {
  it('shows the KPIs', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(await screen.findByText('Mean time to repair')).toBeInTheDocument()
    expect(screen.getByText('Technician workload')).toBeInTheDocument()
  })
})

describe('board', () => {
  it('shows every status column with its cards', async () => {
    renderApp('/board')
    for (const name of ['Open', 'Scheduled', 'In progress', 'On hold', 'Done']) {
      expect(await screen.findByRole('region', { name })).toBeInTheDocument()
    }
    const open = screen.getByRole('region', { name: 'Open' })
    const count = db.listWorkOrders().filter((wo) => wo.status === 'open').length
    expect(within(open).getAllByRole('listitem')).toHaveLength(count)
  })

  it('filters through the URL', async () => {
    const { router } = renderApp('/board?q=WO-1001')
    await screen.findByRole('region', { name: 'Open' })
    expect(
      screen.getAllByRole('link', { name: db.listWorkOrders().find((w) => w.code === 'WO-1001')!.title }),
    ).toHaveLength(1)
    expect(router.state.location.search).toBe('?q=WO-1001')
  })

  it('gives technicians drag handles only on their own cards', async () => {
    renderApp('/board', { userId: 'u-joao' })
    await screen.findByText(/you can move work orders assigned to you/i)
    const mine = db.listWorkOrders().filter((wo) => wo.assigneeId === 'u-joao' && wo.status !== 'open')
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^move wo-/i })).toHaveLength(mine.length))
    expect(screen.queryByRole('button', { name: /new work order/i })).not.toBeInTheDocument()
  })

  it('is read-only for viewers', async () => {
    renderApp('/board', { userId: 'u-daniel' })
    await screen.findByText(/read-only access/i)
    await screen.findByRole('region', { name: 'Open' })
    expect(screen.queryByRole('button', { name: /^move wo-/i })).not.toBeInTheDocument()
  })
})

describe('work orders', () => {
  it('creates a work order and opens it', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/work-orders')
    await user.click(await screen.findByRole('button', { name: /new work order/i }))
    const dialog = await screen.findByRole('dialog', { name: /new work order/i })

    await user.click(within(dialog).getByRole('button', { name: /create work order/i }))
    expect(within(dialog).getByText('Use at least 4 characters.')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose an asset.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Title'), 'Gearbox oil leak')
    await user.selectOptions(within(dialog).getByLabelText('Asset'), 'a-cnv301')
    await user.type(within(dialog).getByLabelText('Checklist'), 'Clean{Enter}Replace seal')
    await user.click(within(dialog).getByRole('button', { name: /create work order/i }))

    expect(await screen.findByRole('heading', { name: 'Gearbox oil leak' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/work-orders\/wo-/)
    expect(screen.getByText('0 of 2 done')).toBeInTheDocument()
    expect(screen.getByText(/rafael lima created the work order/i)).toBeInTheDocument()
  })

  it('explains why a job can’t be closed yet', async () => {
    const wo = db.listWorkOrders().find((w) => w.status === 'in_progress' && w.checklist.some((c) => !c.done))!
    renderApp(`/work-orders/${wo.id}`)
    const status = await screen.findByRole('combobox', { name: 'Status' })
    const done = within(status).getByRole('option', { name: /done — checklist incomplete/i })
    expect(done).toBeDisabled()
  })

  it('lets the assigned technician tick the checklist and comment', async () => {
    const user = userEvent.setup()
    const wo = db.listWorkOrders().find((w) => w.status === 'in_progress' && w.checklist.some((c) => !c.done))!
    const assignee = db.user(wo.assigneeId!)
    renderApp(`/work-orders/${wo.id}`, { userId: assignee.id })
    const pending = wo.checklist.find((c) => !c.done)!
    await user.click(await screen.findByRole('checkbox', { name: pending.label }))
    await waitFor(() => expect(db.getWorkOrder(wo.id).checklist.find((c) => c.id === pending.id)?.done).toBe(true))

    await user.type(screen.getByLabelText('Add a comment'), 'Seal replaced, testing now.')
    await user.click(screen.getByRole('button', { name: 'Comment' }))
    expect(await screen.findByText('Seal replaced, testing now.')).toBeInTheDocument()
  })

  it('shows a 404 for an unknown work order', async () => {
    renderApp('/work-orders/nope')
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument()
  })
})

describe('account menu', () => {
  it('switches user, theme and language', async () => {
    const user = userEvent.setup()
    renderApp('/board')
    // jsdom hides popovers but can't open them, so query the menu as hidden (Playwright covers opening).
    // There are two menus (sidebar on desktop, top bar on mobile); CSS shows one.
    const [menu] = await screen.findAllByRole('group', { name: 'View the app as', hidden: true })
    await user.click(within(menu).getByRole('button', { name: /daniel ortiz/i, hidden: true }))
    expect(await screen.findByText('Read-only access.')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Dark', hidden: true })[0])
    expect(document.documentElement).toHaveClass('dark')
    await user.click(screen.getAllByRole('button', { name: 'Português', hidden: true })[0])
    expect(await screen.findByRole('heading', { name: 'Quadro' })).toBeInTheDocument()
  })
})

describe('users and roles', () => {
  it('is hidden from planners', async () => {
    renderApp('/users')
    expect(await screen.findByText(/you don’t have access to this page/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('lets admins change roles, and refuses removing the last admin', async () => {
    const user = userEvent.setup()
    renderApp('/users', { userId: 'u-marina' })
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Role for Daniel Ortiz' }), 'planner')
    expect(await screen.findByText('Daniel Ortiz is now Planner')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role for Marina Costa' }), 'viewer')
    expect(await screen.findByText('There must be at least one admin.')).toBeInTheDocument()
    expect(db.user('u-marina').role).toBe('admin')
  })
})
