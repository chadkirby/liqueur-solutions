import { componentId, newSpirit, Sweetener } from '$lib';
import type { LoadDataFromUrl } from '$lib/load-data.js';

export function load(): LoadDataFromUrl {
	return {
		storeId: null,
		liqueur: 'Untitled Mixture',
		components: [
			{
				name: '',
				id: componentId(),
				data: newSpirit(100, 40).data
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
	};
}
