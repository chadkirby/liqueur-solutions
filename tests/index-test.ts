import { expect, test, type Page } from '@playwright/test';

const standardMixture =
	'/Test%20Mixture?gz=H4sIAFnxWGcAA43QTW6DMBAF4Lt4HUUG%2F3OO7qos3OCqVrGN8BgCEXevqeomEpGS1Ugzb77FuyKYe4Ma5OwF0mDQAZ2D64M3HiJq3q%2FIa7fd88G2ec7LRbkQhbMir1oNGjUvIwa%2BtA9dsUZIc4Io6fy5t27ZMXRpe6f4iLGQnNRSEVoruq6Hf3rSYIYC24Vg8w1y0Xu3BIvK1FGpuiJcVJgzgXlmT%2FdyQf04MMJwz1v5XK0wfmRACHzqqJV0T8TJGDD%2Bl4np4%2B1vm85DiFulTsdcJsvuaf0BprabO7cBAAA%3D';

test('index page has mixture list', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('mixture-list')).toBeVisible();
	await expect(page.getByPlaceholder('Name your mixture')).toBeVisible();
});

async function expectTotals(
	page: Page,
	expected: { volume: string; abv: string; brix: string; mass: string; cal: string },
) {
	const totals = await page.getByTestId('mixture-totals');
	await expect(totals.getByTestId('volume-detail').getByRole('textbox')).toHaveValue(
		expected.volume,
	);
	await expect(totals.getByTestId('abv-detail').getByRole('textbox')).toHaveValue(expected.abv);
	await expect(totals.getByTestId('brix-detail').getByRole('textbox')).toHaveValue(expected.brix);
	await expect(totals.getByTestId('mass-detail').getByRole('button')).toContainText(expected.mass);
	await expect(totals.getByTestId('cal-detail').getByRole('button')).toContainText(expected.cal);
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

	await page.getByRole('button', { name: 'Spirit' }).click();
	await page.getByRole('button', { name: 'Spirit' }).getByRole('textbox').first().click();
	await page.keyboard.type('200');
	await page.keyboard.press('Enter');
	await expectTotals(page, {
		volume: '332',
		abv: '24.9',
		brix: '14.7',
		mass: '339',
		cal: '657',
	});
});

test('can edit spirit volume with arrows', async ({ page }) => {
	await page.goto(standardMixture);

	await page.getByRole('button', { name: 'Spirit' }).click();
	await page.getByRole('button', { name: 'Spirit' }).getByRole('textbox').first().click();
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('ArrowUp');
	await expectTotals(page, {
		volume: '235',
		abv: '17.9',
		brix: '20.3',
		mass: '246',
		cal: '429',
	});

	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await expectTotals(page, {
		volume: '230',
		abv: '17.4',
		brix: '20.7',
		mass: '242',
		cal: '418',
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

test('can toggle add/remove mode', async ({ page }) => {
	await page.goto(standardMixture);
	await page.getByRole('button', { name: 'Add/Remove' }).click();
	await expect(page.getByTestId('add-button').first()).toBeVisible();
	await page.getByRole('button', { name: 'Add/Remove' }).click();
	await expect(page.getByTestId('add-button')).not.toBeVisible({ timeout: 100 });
});

test('can add all available ingredients', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Add/Remove' }).click();
	while ((await (await page.getByTestId('remove-button').all()).length) > 0) {
		await page.getByTestId('remove-button').last().click({ timeout: 100 });
	}
	expect(
		await page.getByTestId('mixture-ingredient-accordion-header').count(),
		'sanity check: no ingredients are visible',
	).toBe(0);
	const adders = await page.getByTestId('add-button').all();
	for (const [i, element] of adders.entries()) {
		await element.click({ timeout: 100 });
		expect(
			await page.getByTestId('mixture-ingredient-accordion-header').count(),
			`ingredient ${await element.innerText()} was not added`,
		).toBe(i + 1);
	}

	// make sure we can show details on all items
	const headers = await page.getByTestId('mixture-ingredient-accordion-header-header').all();
	for (const [i, header] of headers.entries()) {
		await header.click();
		await expect(
			await page.getByTestId('mixture-ingredient-accordion-header-details').count(),
		).toBe(i + 1);
	}
});
