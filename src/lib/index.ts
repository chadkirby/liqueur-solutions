export { Mixture } from './mixture.js';
export { Sugar } from './sugar.js';
export { Water } from './water.js';
export { Spirit } from './spirit.js';
export { Syrup } from './syrup.js';
export { solveProportions } from './solver.js';
export { isSugarData, isSyrupData, isSpiritData, isWaterData } from './component.js';
export type { Component, SyrupData, SpiritData, SugarData, WaterData } from './component.js';
export { deserialize } from './deserialize.js';

import {
	isSpiritData,
	isSugarData,
	isSyrupData,
	isWaterData,
	type Component
} from './component.js';
import { Mixture } from './mixture.js';
import { Sugar } from './sugar.js';
import { Water } from './water.js';
import { Spirit } from './spirit.js';
import { Syrup } from './syrup.js';

export function dataToMixture(d: { components: Array<{ name: string; data: unknown }> }) {
	const ingredients = (d.components || []).map(({ name, data }) => {
		if (isSpiritData(data)) return { name, component: new Spirit(data.volume, data.abv) };
		if (isWaterData(data)) return { name, component: new Water(data.volume) };
		if (isSugarData(data)) return { name, component: new Sugar(data.mass) };
		if (isSyrupData(data)) return { name, component: new Syrup(data.volume, data.brix) };
		throw new Error('Unknown mixture type');
	});
	return new Mixture<Component>(ingredients);
}
