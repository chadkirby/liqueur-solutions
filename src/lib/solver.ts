import type { Mixture } from './mixture.js';

export interface Target {
	abv: number;
	brix: number;
	volume: number;
}

export function solver(mixture: Mixture, targetAbv: number, targetBrix: number) {
	if (targetAbv < 0 || targetAbv > 100) throw new Error('Target ABV must be between 0 and 100');
	if (targetBrix < 0 || targetBrix > 100) throw new Error('Target Brix must be between 0 and 100');

	let error = 1;
	let iterations = 1000;
	const working = mixture.clone();
	const originalVolumes = working.componentObjects.map((component) => component.volume);
	while (error > 0.01 && --iterations > 0) {
		const deltas = {
			abv: (targetAbv - working.abv) / 100,
			brix: (targetBrix - working.brix) / 100
		};
		const { volume, mass } = working;

		// is abv is below target, we need less water
		working.set('waterVolume', working.waterVolume - volume * deltas.abv);
		// if brix is below target, we need more sugar
		working.set('sugarMass', working.sugarMass * 1 + deltas.brix);
		// if brix is below target, we need less water
		working.set('waterVolume', working.waterVolume - mass * deltas.brix);

		for (const [i, component] of working.componentObjects.entries()) {
			if (component.type === 'spirit') {
				// assume that we have only a fixed amount of spirit available, so clamp its volume
				component.set('volume', Math.min(component.volume, originalVolumes[i]));
			}
		}

		error = Math.sqrt((working.abv - targetAbv) ** 2 + (working.brix - targetBrix) ** 2);
	}
	return working;
}
