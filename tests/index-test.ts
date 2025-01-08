import { expect, test, type Page } from '@playwright/test';

async function type(page: Page, text: string) {
	await page.keyboard.type(text);
}

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
		volume: '230',
		abv: '17.4',
		brix: '20.7',
		mass: '242',
		cal: '418',
	});
});

test('can edit spirit volume directly', async ({ page }) => {
	await page.goto(standardMixture);

	await page.getByRole('button', { name: 'spirit 100 ml 40.0 %' }).click();
	await page
		.getByRole('button', { name: 'spirit 100 ml 40.0 %' })
		.getByRole('textbox')
		.first()
		.click();
	await page.keyboard.type('200');
	await page.keyboard.press('Enter');
	await expectTotals(page, {
		volume: '331',
		abv: '24.1',
		brix: '15.0',
		mass: '333',
		cal: '642'
	});
});

test('can edit spirit volume with arrows', async ({ page }) => {
	await page.goto(standardMixture);

	await page.getByRole('button', { name: 'spirit 100 ml 40.0 %' }).click();
	await page
		.getByRole('button', { name: 'spirit 100 ml 40.0 %' })
		.getByRole('textbox')
		.first()
		.click();
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('ArrowUp');
	await expectTotals(page, {
		volume: '236',
		abv: '17.8',
		brix: '20.3',
		mass: '246',
		cal: '429'
	});

	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await expectTotals(page, {
		volume: '231',
		abv: '17.3',
		brix: '20.7',
		mass: '242',
		cal: '418'
	});
});

test('can show share modal', async ({ page }) => {
	await page.goto(standardMixture);
	await page.getByLabel('Share').click();
	await expect(page.getByTestId('share-modal')).toBeVisible();
	await expect(page.getByTestId('share-modal').locator('#qr-code').getByRole('img')).toBeVisible();
	// click outside the modal to close it
	await page.mouse.click(100, 100);
	await expect(page.getByTestId('share-modal')).not.toBeVisible({ timeout: 5000 });
});

test('esc closes share modal', async ({ page }) => {
	await page.goto(standardMixture);
	await page.getByLabel('Share').click();
	await expect(page.getByTestId('share-modal')).toBeVisible();
	// click outside the modal to close it
	await page.keyboard.press('Escape');
	await expect(page.getByTestId('share-modal')).not.toBeVisible({ timeout: 5000 });
});

test('can show files drawer', async ({ page }) => {
	await page.goto(standardMixture);
	await page.getByLabel('Files').click();
	await expect(page.getByRole('heading', { name: 'Saved Mixtures' })).toBeVisible();
	// click outside the drawer to close it
	page.mouse.click(page.viewportSize()!.width - 100, 100);
	await expect(page.getByRole('heading', { name: 'Saved Mixtures' })).not.toBeVisible();
});

test('can show files drawer and close with esc', async ({ page }) => {
	await page.goto(standardMixture);
	await page.getByLabel('Files').click();
	await expect(page.getByRole('heading', { name: 'Saved Mixtures' })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByTestId('share-modal')).not.toBeVisible({ timeout: 5000 });
});
