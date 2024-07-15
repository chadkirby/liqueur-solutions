import type { Component } from './component.js';
import type { Target } from './solver.js';

export function round(value: number, precision: number) {
	const factor = 10 ** precision;
	return Math.round(value * factor) / factor;
}

export type Analysis = Target & {
	mass: number;
	kcal: number;
	proof: number;
};

export function analyze(
	item: Pick<Component, 'volume' | 'mass' | 'abv' | 'brix' | 'alcoholMass' | 'sugarMass' | 'kcal'>,
	precision = 0
): Analysis {
	return {
		volume: round(item.volume, precision),
		mass: round(item.mass, precision),
		abv: round(item.abv, precision),
		brix: round(item.brix, precision),
		kcal: round(item.kcal, precision),
		proof: round(item.abv * 2, precision)
	};
}
