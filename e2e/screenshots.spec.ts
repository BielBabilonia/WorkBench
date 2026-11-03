import { expect, test } from '@playwright/test'

// Not assertions so much as a visual record for the README. Run on demand:
//   npx playwright test screenshots --project=chromium
test.describe('screenshots', () => {
  test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to capture')
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const theme of ['light', 'dark'] as const) {
    test(`pages in ${theme} mode`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('workbench.theme', t), theme)
      for (const [name, path, ready] of [
        ['dashboard', '/', 'Technician workload'],
        ['board', '/board', 'In progress'],
        ['work-orders', '/work-orders', 'Export CSV'],
        ['assets', '/assets', 'CMP-101'],
      ] as const) {
        await page.goto(path)
        await expect(page.getByText(ready).first()).toBeVisible()
        await page.waitForTimeout(400)
        await page.screenshot({ path: `docs/screenshots/${name}-${theme}.png`, fullPage: name !== 'board' })
      }
      await page.goto('/work-orders')
      await page.getByRole('link').filter({ hasText: /./ }).nth(8).click()
      await expect(page.getByText('Activity')).toBeVisible()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `docs/screenshots/detail-${theme}.png`, fullPage: true })
    })
  }

  test('account menu', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^Account:/ }).filter({ visible: true }).click()
    await expect(page.getByRole('group', { name: 'View the app as' }).filter({ visible: true })).toBeVisible()
    await page.screenshot({ path: 'docs/screenshots/account-menu.png' })
  })

  test('mobile board', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/board')
    await expect(page.getByRole('region', { name: 'Open', exact: true })).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'docs/screenshots/board-mobile.png' })
  })
})
