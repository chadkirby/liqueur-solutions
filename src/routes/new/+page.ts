import { newSpirit, Sweetener } from '$lib';
import type { LoadDataFromUrl } from '$lib/load-data.js';

export function load(): LoadDataFromUrl {
	return {
		storeId: null,
		liqueur: 'Untitled Mixture',
		components: [
			{
				name: 'spirit',
				id: 'spirit-0',
				data: newSpirit(100, 40).data
			},
			{
				name: 'water',
				id: 'water-0',
				data: { volume: 100, type: 'water' }
			},
			{
				name: 'sugar',
				id: 'sweetener-0',
				data: new Sweetener('sucrose', 50).data
			}
		]
	};
}
