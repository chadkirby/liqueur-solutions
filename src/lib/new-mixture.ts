import { filesDb, type FileItem } from './storage.svelte.js';
import { urlEncode } from './mixture-store.svelte.js';
import { componentId, dataToMixture, newSpirit } from './mixture.js';
import { openFile } from './open-file.js';
import { generateStorageId } from './storage-id.js';
import { Sweetener } from './components/sweetener.js';

export async function loadNewMixture() {
	const mixture = dataToMixture({
		components: [
			{
				name: '',
				id: componentId(),
				data: newSpirit(200, 40).data
			},
			{
				name: '',
				id: componentId(),
				data: { volume: 100, type: 'water' }
			},
			{
				name: '',
				id: componentId(),
				data: new Sweetener('sucrose', 50).data
			}
		]
	});

	const adjectives = ['Untitled', 'New', 'Delicious', 'Refreshing', 'Tasty', 'Boozy'];
	const nouns = ['Mixture', 'Solution', 'Blend', 'Beverage', 'Drink', 'Mix'];

	const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

	const item: FileItem = {
		id: generateStorageId(),
		accessTime: Date.now(),
		name,
		desc: mixture.describe(),
		href: urlEncode(name, mixture)
	};

	await filesDb.write(item);
	openFile(item.id);
}
