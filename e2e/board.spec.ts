import { expect, test, type Locator, type Page } from '@playwright/test'

const column = (page: Page, name: string) => page.getByRole('region', { name, exact: true })

/** Drags with real mouse steps so dnd-kit's sensors see a movement. */
async function drag(page: Page, from: Locator, to: Locator) {
  const source = (await from.boundingBox())!
  const target = (await to.boundingBox())!
  await page.mouse.move(source.x + source.width / 2, source.y + 12)
  await page.mouse.down()
  await page.mouse.move(source.x + source.width / 2 + 10, source.y + 20, { steps: 5 })
  await page.mouse.move(target.x + target.width / 2, target.y + 60, { steps: 15 })
  await page.mouse.up()
}

/** Titles repeat across jobs; the WO code doesn't. */
async function codeOf(card: Locator) {
  return (await card.getByText(/^WO-\d+$/).textContent())!
}

test.beforeEach(async ({ page }) => {
  await page.goto('/board')
  await expect(column(page, 'Open')).toBeVisible()
})

test('a planner drags a card from Open to Scheduled', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse drag; touch uses a long press')
  const card = column(page, 'Open').getByRole('listitem').first()
  const code = await codeOf(card)
  await drag(page, card, column(page, 'Scheduled'))

  await expect(column(page, 'Scheduled').getByText(code, { exact: true })).toBeVisible()
  await expect(page.getByText(`${code} moved to Scheduled`)).toBeVisible()

  // Persisted in the (simulated) backend: still there after a reload.
  await page.reload()
  await expect(column(page, 'Scheduled').getByText(code, { exact: true })).toBeVisible()
})

test('a card moves between columns with the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard flow')
  const card = column(page, 'Scheduled').getByRole('listitem').first()
  const code = await codeOf(card)
  await card.getByRole('button', { name: /^Move WO-/ }).focus()
  // Pauses like a person's: dnd-kit measures the columns right after pick-up.
  for (const key of ['Space', 'ArrowRight', 'Space']) {
    await page.keyboard.press(key)
    await page.waitForTimeout(250)
  }

  await expect(column(page, 'In progress').getByText(code, { exact: true })).toBeVisible()
})

test('closing a job with an open checklist is refused before the request', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse drag')
  const card = column(page, 'In progress').getByRole('listitem').first()
  const code = await codeOf(card)
  const done = column(page, 'Done')
  const before = await done.getByRole('listitem').count()
  await drag(page, card, done)

  await expect(column(page, 'In progress').getByText(code, { exact: true })).toBeVisible()
  await expect(done.getByRole('listitem')).toHaveCount(before)
})

test('switching to a viewer makes the board read-only', async ({ page }) => {
  await page
    .getByRole('button', { name: /^Account:/ })
    .filter({ visible: true })
    .click()
  await page
    .getByRole('group', { name: 'View the app as' })
    .filter({ visible: true })
    .getByRole('button', { name: /Daniel Ortiz/ })
    .click()
  await expect(page.getByText('Read-only access.')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Move WO-/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'New work order' })).toHaveCount(0)
})

test.afterEach(async ({ page }) => {
  // Each test starts from the seed: persistence would leak moves between tests.
  await page.evaluate(() => localStorage.clear())
})
