import type { ComponentData } from './component.js';
import type { Target } from './solver.js';

export function round(value: number, precision: number) {
	const factor = 10 ** precision;
	return Math.round(value * factor) / factor;
}

// see https://www.vinolab.hr/calculator/gravity-density-sugar-conversions-en19

export function computeSg(brix: number) {
	return (
		0.00000005785037196 * brix ** 3 +
		0.00001261831344 * brix ** 2 +
		0.003873042366 * brix +
		0.9999994636
	);
}

export type Analysis = Target & {
	mass: number;
	kcal: number;
	proof: number;
};

export function getKcal(item: Pick<ComponentData, 'alcoholMass' | 'sugarMass'>) {
	return item.sugarMass * 3.87 + item.alcoholMass * 7.1;
}

export function analyze(
	item: Pick<ComponentData, 'volume' | 'mass' | 'abv' | 'brix' | 'alcoholMass' | 'sugarMass'>,
	precision = 0
): Analysis {
	return {
		volume: round(item.volume, precision),
		mass: round(item.mass, precision),
		abv: round(item.abv, precision),
		brix: round(item.brix, precision),
		kcal: round(getKcal(item), precision),
		proof: round(item.abv * 2, precision)
	};
}
