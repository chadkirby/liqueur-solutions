import { browser } from '$app/environment';
import { Sweetener, Water } from '$lib/index.svelte.js';
import { Mixture, newSpirit } from '$lib/mixture.js';
import { generateStorageId } from '$lib/storage-id.js';
import type { StoredFileData } from '$lib/storage.svelte.js';
import { redirect } from '@sveltejs/kit';

export async function load(args: { url: URL; params: { liqueur: string } }): Promise<never> {
	const adjectives = ['Untitled', 'New', 'Delicious', 'Refreshing', 'Tasty', 'Boozy'];
	const nouns = ['Mixture', 'Solution', 'Blend', 'Beverage', 'Drink', 'Mix'];

	const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

	const mixture = new Mixture([]);
	mixture.addComponent({ name: '', id: 'spirit', component: newSpirit(200, 40) });
	mixture.addComponent({ name: '', id: 'water', component: new Water(100) });
	mixture.addComponent({ name: '', id: 'sugar', component: new Sweetener('sucrose', 50) });

	const item: StoredFileData = {
		id: generateStorageId(),
		accessTime: Date.now(),
		name,
		desc: mixture.describe(),
		mixture: { name, data: mixture.toStorageData() }
	};

	if (browser) {
		const { filesDb } = await import('$lib/storage.svelte.js');
		await filesDb.write(item);
	}
	throw redirect(303, `/file/${item.id}`);
}
