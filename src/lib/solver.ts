import type { Mixture } from './mixture.js';

export interface Target {
	abv: number;
	brix: number;
	volume: number;
}

const { sqrt } = Math;

export function solver(mixture: Mixture, targetAbv: number, targetBrix: number) {
	if (targetAbv < 0 || targetAbv > 100) throw new Error('Target ABV must be between 0 and 100');
	if (targetBrix < 0 || targetBrix > 100) throw new Error('Target Brix must be between 0 and 100');

	let error = 1;
	let iterations = 1000;
	const working = mixture.clone();
	while (error > 0.01 && --iterations > 0) {
		working.set('alcoholVolume', working.volume * (targetAbv / 100));

		working.set('sugarMass', working.mass * (targetBrix / 100));

		error = sqrt((working.abv - targetAbv) ** 2 + (working.brix - targetBrix) ** 2);
	}
	return working;
}
