import { deserialize } from '$lib';
import type { SpiritData, WaterData, SugarData, SyrupData } from '$lib';

export function load({ url }: {url: URL}): Record<string, SpiritData | WaterData | SugarData | SyrupData> {
	try {
		const mixture = deserialize(url.searchParams);
		return Object.fromEntries([...mixture].map(([key, { data }]) => [key, data]));
	} catch (err) {
    console.error(err);
		return {
			spirit: { volume: 100, abv: 40, type: 'spirit' },
			water: { volume: 100, type: 'water' },
			sugar: { mass: 50, type: 'sugar' }
		};
	}
}
