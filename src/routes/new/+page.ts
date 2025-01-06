import { browser } from '$app/environment';
import { SubstanceComponent } from '$lib/ingredients/substance-component.js';
import { newSpirit } from '$lib/mixture-factories.js';
import type { StoredFileData } from '$lib/mixture-types.js';
import { componentId, Mixture } from '$lib/mixture.js';
import { generateStorageId } from '$lib/storage-id.js';
import { redirect } from '@sveltejs/kit';

export async function load(args: { url: URL; params: { liqueur: string } }): Promise<never> {
	const adjectives = ['Untitled', 'New', 'Delicious', 'Refreshing', 'Tasty', 'Boozy'];
	const nouns = ['Mixture', 'Solution', 'Blend', 'Beverage', 'Drink', 'Mix'];

	const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

	const spirit = newSpirit(500, 40);
	const mixture = new Mixture(componentId(), [
		{ name: '', id: componentId(), item: spirit, mass: spirit.mass },
		{ name: '', id: componentId(), item: SubstanceComponent.new('water'), mass: 200 },
		{ name: '', id: componentId(), item: SubstanceComponent.new('sucrose'), mass: 80 },
	]);

	const item: StoredFileData = {
		id: generateStorageId(),
		accessTime: Date.now(),
		name,
		desc: mixture.describe(),
		mixture: mixture.toStorageData(),
		ingredientDb: mixture.toStorageDbData(),
	};

	if (browser) {
		const { filesDb } = await import('$lib/storage.svelte.js');
		await filesDb.write(item);
	}
	throw redirect(303, `/file/${item.id}`);
}
