import { Ethanol } from './ethanol.js';
import { Mixture } from './mixture.js';
import { Sugar } from './sugar.js';
import { Water } from './water.js';

export interface Target {
	abv: number;
	brix: number;
	volume: number;
}

export function solveProportions(targetAbv: number, targetBrix: number) {
	if (targetAbv < 0 || targetAbv > 100) throw new Error('Target ABV must be between 0 and 100');
	if (targetBrix < 0 || targetBrix > 100) throw new Error('Target Brix must be between 0 and 100');

	const ethanol = new Ethanol(100);
	const volumeAtTargetAbv = ethanol.volume / (targetAbv / 100);
	const water = new Water(volumeAtTargetAbv - ethanol.volume);
	const sugar = new Sugar((ethanol.mass + water.mass) / (targetBrix / 100));
	if (!sugar) throw new Error('Sugar component not found');

	const components = [
		{ name: 'ethanol', component: ethanol },
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
		ethanol.volume = Math.max(0, ethanol.volume);
		water.volume = Math.max(0, water.volume);
		sugar.mass = Math.max(0, sugar.mass);

		error = Math.sqrt((mixture.abv - targetAbv) ** 2 + (mixture.brix - targetBrix) ** 2);
	}

	const output = new Mixture<Water | Ethanol | Sugar>(components);

	// Scale the mixture to 100ml
	output.volume = 100;

	return {
		mixture: output,
		error,
		iterations: 1000 - iterations
	};
}
