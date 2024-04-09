import type { Mixture } from './mixture.js';

export interface Target {
	abv: number;
	brix: number;
	volume: number;
}

const { sqrt } = Math;

export function solver(mixture: Mixture, targetAbv: number | null, targetBrix: number | null) {
	if (targetAbv !== null && (targetAbv < 0 || targetAbv > 100))
		throw new Error('Target ABV must be between 0 and 100');
	if (targetBrix !== null && (targetBrix < 0 || targetBrix > 100))
		throw new Error('Target Brix must be between 0 and 100');

	let error = 1;
	let iterations = 1000;
	const working = mixture.clone();
	while (error > 0.01 && --iterations > 0) {
		if (targetAbv !== null) {
			working.set('alcoholVolume', working.volume * (targetAbv / 100));
		}
		if (targetBrix !== null) {
			working.set('sugarMass', working.mass * (targetBrix / 100));
		}

		error = 0;
		if (targetAbv !== null) {
			error += (working.abv - targetAbv) ** 2;
		}
		if (targetBrix !== null) {
			error += (working.brix - targetBrix) ** 2;
		}

		error = sqrt(error);
	}
	return working;
}
