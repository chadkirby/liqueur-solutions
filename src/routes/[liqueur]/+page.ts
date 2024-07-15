import { dataToMixture, deserialize, type SerializedComponent, newSpirit, Sweetener } from '$lib';

export function load({ url, params }: { url: URL; params: { liqueur: string } }): {
	liqueur: string;
	components: Array<SerializedComponent>;
} {
	if (url.pathname.startsWith('/favicon')) return;
	try {
		const { components } = deserialize(url.searchParams);
		// decode params.liqueur
		const liqueur = decodeURIComponent(params.liqueur) ?? 'mixture';
		const mixture = dataToMixture({ components });
		if (!mixture.isValid) throw new Error('Invalid mixture');
		return {
			liqueur,
			components
		};
	} catch (err) {
		console.error(err);
		return {
			liqueur: 'mixture',
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
