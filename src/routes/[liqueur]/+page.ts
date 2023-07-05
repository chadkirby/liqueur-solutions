import { deserialize } from '$lib';
import type { SpiritData, WaterData, SugarData, SyrupData } from '$lib';

export function load({ url, params }: { url: URL; params: { liqueur: string } }): {
	liqueur: string;
	components: Array<{ name: string; data: SpiritData | WaterData | SugarData | SyrupData }>;
} {
	try {
		const { components } = deserialize(url.searchParams);
		// decode params.liqueur
		const liqueur = decodeURIComponent(params.liqueur) ?? 'mixture';
		return {
			liqueur,
			components
		};
	} catch (err) {
		console.error(err);
		return {
			liqueur: 'mixture',
			components: [
				{ name: 'spirit', data: { volume: 100, abv: 40, type: 'spirit' } },
				{ name: 'water', data: { volume: 100, type: 'water' } },
				{ name: 'sugar', data: { mass: 50, type: 'sugar' } }
			]
		};
	}
}
