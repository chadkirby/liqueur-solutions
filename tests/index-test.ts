import { expect, test, type Page } from '@playwright/test';
import { scheduler } from 'node:timers/promises';

const standardMixture =
	'/Test%20Mixture?gz=H4sIAFnxWGcAA43QTW6DMBAF4Lt4HUUG%2F3OO7qos3OCqVrGN8BgCEXevqeomEpGS1Ugzb77FuyKYe4Ma5OwF0mDQAZ2D64M3HiJq3q%2FIa7fd88G2ec7LRbkQhbMir1oNGjUvIwa%2BtA9dsUZIc4Io6fy5t27ZMXRpe6f4iLGQnNRSEVoruq6Hf3rSYIYC24Vg8w1y0Xu3BIvK1FGpuiJcVJgzgXlmT%2FdyQf04MMJwz1v5XK0wfmRACHzqqJV0T8TJGDD%2Bl4np4%2B1vm85DiFulTsdcJsvuaf0BprabO7cBAAA%3D';

test('index page has mixture list', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('mixture-list')).toBeVisible();
	await expect(page.getByPlaceholder('Name your mixture')).toBeVisible();
});

async function expectTotals(
	page: Page,
	expected: { volume: string; abv: string; brix: string; mass: string; cal: string }
) {
	await expect(page.getByTestId('volume-totals').getByRole('textbox')).toHaveValue(expected.volume);
	await expect(page.getByTestId('abv-totals').getByRole('textbox')).toHaveValue(expected.abv);
	await expect(page.getByTestId('brix-totals').getByRole('textbox')).toHaveValue(expected.brix);
	await expect(page.getByTestId('mass-totals').getByRole('button')).toContainText(expected.mass);
	await expect(page.getByTestId('cal-totals').getByRole('button')).toContainText(expected.cal);
}

test('index page has expected totals', async ({ page }) => {
	await page.goto(standardMixture);

	await expectTotals(page, {
		volume: '231',
		abv: '17.3',
		brix: '20.7',
		mass: '242',
		cal: '418'
	});
});

test('can edit spirit volume', async ({ page }) => {
	await page.goto(standardMixture);

	await page.getByRole('button', { name: 'spirit 100 ml 40.0 %' }).click();
	await page
		.getByRole('button', { name: 'spirit 100 ml 40.0 %' })
		.getByRole('textbox')
		.first()
		.click();
	await scheduler.wait(100);
	await page
		.getByRole('button', { name: 'spirit 100 ml 40.0 %' })
		.getByRole('textbox')
		.first()
		.pressSequentially('200', { delay: 10 });
	await scheduler.wait(100);
	await page
		.getByRole('button', { name: 'spirit 100 ml 40.0 %' })
		.getByRole('textbox')
		.first()
		.press('Enter');
});
