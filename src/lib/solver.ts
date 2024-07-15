import type { Mixture } from './mixture.js';

export interface Target {
	abv: number;
	brix: number;
	volume: number;
}

const { sqrt } = Math;

export function solver(
	mixture: Mixture,
	targets: { abv: number | null; brix: number | null; volume: number | null }
) {
	if (targets.abv !== null && (targets.abv < 0 || targets.abv > 100))
		throw new Error('Target ABV must be between 0 and 100');
	if (targets.brix !== null && (targets.brix < 0 || targets.brix > 100))
		throw new Error('Target Brix must be between 0 and 100');

	let error = 1;
	let iterations = 1000;
	const working = mixture.clone();
	while (error > 0.01 && --iterations > 0) {
		if (targets.abv !== null) {
			const targetVolume = working.volume * (targets.abv / 100);
			working.adjustVolumeForEthanolTarget(targetVolume);
			const actualAlcohol = working.alcoholVolume;
			if (actualAlcohol.toFixed(1) !== targetVolume.toFixed(1)) {
				// instead set water volume
				const waterComponents = working.componentObjects.filter((c) => c.abv === 0 && c.brix === 0);
				const alcComponents = working.componentObjects.filter((c) => c.abv > 0);
				const alcWaterVolume = alcComponents.reduce((sum, c) => sum + c.waterVolume, 0);
				const targetWaterVolume = working.volume - targetVolume - alcWaterVolume;
				const startingWaterVolume = waterComponents.reduce((sum, c) => sum + c.waterVolume, 0);
				for (const component of waterComponents) {
					const ratio = component.waterVolume / startingWaterVolume;
					component.setVolume(targetWaterVolume * ratio);
				}
			}
		}
		if (targets.brix !== null) {
			working.setEquivalentSugarMass(working.mass * (targets.brix / 100));
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
	if (targets.volume !== null) {
		working.setVolume(targets.volume);
	}
	return working;
}
