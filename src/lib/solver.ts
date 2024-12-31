import { calculateAbvProportions } from './ingredients/density.js';
import type { Component } from './index.svelte.js';
import { Mixture } from './mixture.js';
import { SubstanceComponent } from './ingredients/index.js';

export interface Target {
	abv: number;
	brix: number;
	volume: number;
}

const { sqrt } = Math;

export function solver(
	mixture: Mixture,
	targets: { abv: number | null; brix: number | null; pH: number | null }
) {
	if (targets.abv !== null && (targets.abv < 0 || targets.abv > 100)) {
		throw new Error('Target ABV must be between 0 and 100');
	}
	if (targets.brix !== null && (targets.brix < 0 || targets.brix > 100)) {
		throw new Error('Target Brix must be between 0 and 100');
	}
	if (targets.pH !== null && (targets.pH < 0 || targets.pH > 7)) {
		throw new Error('Target pH must be between 0 and 7');
	}
	console.log('solver', { targets });

	const tolerance = 0.01;
	let error = 1;
	let iterations = 1000;
	const working = mixture.clone();
	while (error > tolerance && --iterations > 0) {
		const analysis = working.analyze(Math.log10(1 / tolerance));
		console.log('solver', { ...analysis, iterations, error, tolerance });
		if (targets.abv !== null) {
			const targetVolume = working.volume * (targets.abv / 100);

			const actualAlcohol = working.alcoholVolume;
			if (!isClose(actualAlcohol, targetVolume, tolerance)) {
				for (const { component, id } of working.eachIngredient()) {
					if (
						(component instanceof SubstanceComponent && component.substanceId === 'ethanol') ||
						(component instanceof Mixture && component.alcoholMass > 0)
					) {
						working.scaleIngredientMass(id, increment(targetVolume / actualAlcohol));
					}
				}
			}

			if (!isClose(working.alcoholVolume, targetVolume, tolerance)) {
				// instead set water volume
				const waterComponents = [
					...working.eachIngredient(
						(igdt) =>
							working.get(igdt, 'alcoholMass') === 0 &&
							working.get(igdt, 'equivalentSugarMass') === 0 &&
							isClose(working.get(igdt, 'pH'), 7, 0.1)
					)
				];
				const alcComponents = working.eachIngredient(
					(igdt) => working.get(igdt, 'alcoholMass') > 0
				);
				const alcWaterVolume = alcComponents.reduce(
					(sum, igdt) => sum + working.get(igdt, 'waterVolume'),
					0
				);
				const targetWaterVolume = working.volume - targetVolume - alcWaterVolume;
				const startingWaterVolume = waterComponents.reduce(
					(sum, igdt) => sum + working.get(igdt, 'waterVolume'),
					0
				);
				for (const { component } of waterComponents) {
					working.scaleIngredientMass(
						component.id,
						increment(targetWaterVolume / startingWaterVolume)
					);
				}
			}
		}
		if (targets.brix !== null) {
			working.setEquivalentSugarMass(working.mass * increment(targets.brix / 100));
		}

		error = 0;
		if (targets.abv !== null) {
			error += (working.abv - targets.abv) ** 2;
		}
		if (targets.brix !== null) {
			error += (working.brix - targets.brix) ** 2;
		}

		error = sqrt(error);
	}
	console.log('solver', { error, iterations, ...working.analyze(2) });
	return working;
}

function increment(wholeRatio: number): number {
	return 0.25 * wholeRatio + 0.75;
}

export function setVolume(working: Mixture, targetVolume: number, iteration = 0): void {
	if (isClose(targetVolume, working.volume, 0.001)) return;

	// Try simple mass scaling first
	const factor = targetVolume / working.volume;
	working.setMass(working.mass * factor);

	// If we hit the target, we're done
	if (isClose(working.volume, targetVolume, 0.001)) return;

	// If we get here, simple scaling didn't work
	// This likely means we have ethanol + water interaction
	const delta = targetVolume - working.volume;

	if (iteration < 10) {
		// If we're too small, we need to add more than the simple delta
		// If we're too large, we need to add less than the simple delta
		const adjustmentFactor = delta > 0 ? 1.1 : 0.9;
		return setVolume(working, targetVolume + delta * adjustmentFactor, iteration + 1);
	}
}

function isClose(a: number, b: number, delta = 0.01) {
	return Math.abs(a - b) < delta;
}
