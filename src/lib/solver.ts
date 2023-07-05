import { Ethanol } from './ethanol.js';
import { Mixture } from './mixture.js';
import { Spirit } from './spirit.js';
import { Sugar } from './sugar.js';
import { Syrup } from './syrup.js';
import { Water } from './water.js';

export interface Target {
	abv: number;
	brix: number;
	volume: number;
}

export function solve(sourceSpirit: Spirit, targetAbv: number, targetBrix: number) {
	if (targetAbv > sourceSpirit.abv) {
		throw new Error(`Target ABV (${targetAbv}) must be less than source ABV (${sourceSpirit.abv})`);
	}

	const ethanol = sourceSpirit.findByType(Ethanol.is);
	if (!ethanol) throw new Error('Ethanol component not found');

	const volumeAtTargetAbv = sourceSpirit.alcoholVolume / (targetAbv / 100);
	const syrup = new Syrup(volumeAtTargetAbv - sourceSpirit.volume, targetBrix);
	const water = syrup.findByType(Water.is);
	if (!water) throw new Error('Water component not found');
	const sugar = syrup.findByType(Sugar.is);
	if (!sugar) throw new Error('Sugar component not found');

	const components = [
		{ name: 'ethanol', component: ethanol.clone() },
		{ name: 'water', component: water },
		{ name: 'sugar', component: sugar }
	];
	const mixture = new Mixture<Water | Ethanol | Sugar>(components);

	let error = 1;
	let iterations = 1000;
	while (error > 0.01 && --iterations > 0) {
		const dError_dAbv = (targetAbv - mixture.abv) / 100;
		const dError_dBrix = (targetBrix - mixture.brix) / 100;
		const { volume, mass } = mixture;

		// is abv is below target, we need less water
		water.volume -= volume * dError_dAbv;
		// if brix is below target, we need more sugar
		sugar.mass *= 1 + dError_dBrix;
		// if brix is below target, we need less water
		water.volume -= mass * dError_dBrix;

		// Ensure component volumes and mass stay within the valid range
		ethanol.volume = Math.min(
			sourceSpirit.alcoholVolume,
			Math.max(0, ethanol.volume)
		);
		water.volume = Math.max(0, water.volume);
		sugar.mass = Math.max(0, sugar.mass);

		error = Math.sqrt((mixture.abv - targetAbv) ** 2 + (mixture.brix - targetBrix) ** 2);
	}

	// now convert the volume of ethanol to an equivalent volume of spirit
	const targetSpirit = new Spirit(
		Math.round(mixture.alcoholVolume / (sourceSpirit.abv / 100)),
		sourceSpirit.abv
	);
	const targetSugar = new Sugar(mixture.sugarMass);
	const targetWater = new Water(Math.round(mixture.waterVolume - targetSpirit.waterVolume));

	const output = new Mixture<Water | Spirit | Sugar>([
		{name:'spirit', component: targetSpirit,},
		{name:'sugar', component: targetSugar,},
		{name:'water', component: targetWater},
	]);

	return {
		mixture: output,
		error,
		iterations: 1000 - iterations
	};
}
