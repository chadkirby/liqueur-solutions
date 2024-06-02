import { isSpiritData, isSugarData, isSyrupData, isWaterData } from './component.js';
import { Mixture } from './mixture.js';
import { Sugar } from './sugar.js';
import { Water } from './water.js';
import { Spirit } from './spirit.js';
import { Syrup } from './syrup.js';

export function dataToMixture(d: {
	components: Array<{ name: string; id: string; data: unknown }>;
}) {
	const ingredients = (d.components || []).map(({ name, id, data }) => {
		if (isSpiritData(data)) return { name, id, component: new Spirit(data.volume, data.abv) };
		if (isWaterData(data)) return { name, id, component: new Water(data.volume) };
		if (isSugarData(data)) return { name, id, component: new Sugar(data.mass) };
		if (isSyrupData(data))
			return { name, id, component: new Syrup(data.volume, data.brix) };
		throw new Error('Unknown mixture type');
	});
	return new Mixture(ingredients);
}
