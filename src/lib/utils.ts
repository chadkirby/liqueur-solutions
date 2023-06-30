import type { ComponentData, SpiritData, SugarData, SyrupData, WaterData } from "./component.js";
import type { Target } from "./solver.js";

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

export function serialize(data: SpiritData | WaterData | SugarData | SyrupData): string {
	return Object.values(data)
		.map((d) => (typeof d === 'number' ? d.toFixed(0) : d))
		.join('-');
}

export function analyze(
	item: Pick<ComponentData, 'volume' | 'mass' | 'abv' | 'brix'>,
	precision = 0
): Target & {
	mass: number;
} {
	return {
		volume: round(item.volume, precision),
		mass: round(item.mass, precision),
		abv: round(item.abv, precision),
		brix: round(item.brix, precision)
	};
}

