import { browser } from '$app/environment';
import { currentDataVersion, type StoredFileDataV1 } from '$lib/data-format.js';
import { SubstanceComponent } from '$lib/ingredients/substance-component.js';
import { newSpirit } from '$lib/mixture-factories.js';
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

	const item: StoredFileDataV1 = {
		version: currentDataVersion,
		id: generateStorageId(),
		accessTime: Date.now(),
		name,
		desc: mixture.describe(),
		rootMixtureId: mixture.id,
		ingredientDb: mixture.serialize(),
	};

	if (browser) {
		const { filesDb } = await import('$lib/storage.svelte.js');
		await filesDb.write(item);
	}
	throw redirect(303, `/file/${item.id}`);
}
