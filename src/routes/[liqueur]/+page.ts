import { dataToMixture, deserialize, type SerializedComponent } from '$lib';

export function load({ url, params }: { url: URL; params: { liqueur: string } }): {
	liqueur: string;
	components: Array<SerializedComponent>;
} {
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
					data: { volume: 100, abv: 40, type: 'spirit' }
				},
				{ name: 'water', id: 'water-0', data: { volume: 100, type: 'water' } },
				{ name: 'sugar', id: 'sugar-0', data: { mass: 50, type: 'sweetener', subType: 'sucrose' } }
			]
		};
	}
}
