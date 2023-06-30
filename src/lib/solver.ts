import { Mixture } from "./mixture.js";
import { Spirit } from "./spirit.js";
import { Sugar } from "./sugar.js";
import { Water } from "./water.js";

export interface Target {
	abv: number;
	brix: number;
	volume: number;
}

export function solve(sourceSpirit: Spirit, targetAbv: number, targetBrix: number) {
	if (targetAbv > sourceSpirit.abv) {
		throw new Error(`Target ABV (${targetAbv}) must be less than source ABV (${sourceSpirit.abv})`);
	}

	const volumeAtTargetAbv = sourceSpirit.alcoholVolume / (targetAbv / 100);

	const mixture = new Mixture({
		ethanol: sourceSpirit.components.ethanol.clone(),
		water: new Water(volumeAtTargetAbv * (1 - targetBrix / 100)),
		sugar: new Sugar(volumeAtTargetAbv * (targetBrix / 100))
	});

	const components = mixture.components;

	let error = 1;
	let iterations = 1000;
	while (error > 0.01 && --iterations > 0) {
		const dError_dAbv = (targetAbv - mixture.abv) / 100;
		const dError_dBrix = (targetBrix - mixture.brix) / 100;
		const { volume, mass } = mixture;

		// is abv is below target, we need less water
		components.water.volume -= volume * dError_dAbv;
		// if brix is below target, we need more sugar
		components.sugar.mass *= 1 + dError_dBrix;
		// if brix is below target, we need less water
		components.water.volume -= mass * dError_dBrix;

		// Ensure component volumes and mass stay within the valid range
		components.ethanol.volume = Math.min(
			sourceSpirit.alcoholVolume,
			Math.max(0, components.ethanol.volume)
		);
		components.water.volume = Math.max(0, components.water.volume);
		components.sugar.mass = Math.max(0, components.sugar.mass);

		error = Math.sqrt((mixture.abv - targetAbv) ** 2 + (mixture.brix - targetBrix) ** 2);
	}

	// now convert the volume of ethanol to an equivalent volume of spirit
	const targetSpirit = new Spirit(
		Math.round(mixture.alcoholVolume / (sourceSpirit.abv / 100)),
		sourceSpirit.abv
	);
	const targetSugar = new Sugar(mixture.sugarMass);
	const targetWater = new Water(Math.round(mixture.waterVolume - targetSpirit.waterVolume));

	const output = new Mixture({
		spirit: targetSpirit,
		sugar: targetSugar,
		water: targetWater
	});

	return {
		mixture: output,
		error,
		iterations: 1000 - iterations
	};
}

