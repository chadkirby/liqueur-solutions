import {
	type SpiritData,
	type WaterData,
	type SugarData,
	type SyrupData,
	dataToMixture,
	deserialize
} from '$lib';

export function load({ url, params }: { url: URL; params: { liqueur: string } }): {
	liqueur: string;
	components: Array<{ name: string; data: SpiritData | WaterData | SugarData | SyrupData }>;
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
				{ name: 'spirit', data: { volume: 100, abv: 40, type: 'spirit', locked: 'none' } },
				{ name: 'water', data: { volume: 100, type: 'water', locked: 'none' } },
				{ name: 'sugar', data: { mass: 50, type: 'sugar', locked: 'none' } }
			]
		};
	}
}
