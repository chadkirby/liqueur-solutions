import { deserialize, newSpirit, Sweetener } from '$lib';
import type { LoadDataFromUrl } from '$lib/load-data.js';

export function load(args: { url: URL; params: { liqueur: string } }): LoadDataFromUrl {
	const { url, params } = args;
	// if (url.pathname.startsWith('/favicon')) return;
	try {
		const mixture = deserialize(url.searchParams);
		// decode params.liqueur
		const liqueur = decodeURIComponent(params.liqueur) ?? 'mixture';
		if (!mixture.isValid) throw new Error('Invalid mixture');

		return {
			storeId: null,
			liqueur,
			components: mixture.data.components
		};
	} catch (err) {
		console.error(err);
		return {
			storeId: null,
			liqueur: '',
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
}
