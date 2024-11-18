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
	equivalentSugarMass: number;
};

export function analyze(
	item: Pick<
		Component,
		'volume' | 'mass' | 'abv' | 'brix' | 'alcoholMass' | 'equivalentSugarMass' | 'kcal'
	>,
	precision = 0
): Analysis {
	return {
		volume: round(item.volume, precision),
		mass: round(item.mass, precision),
		abv: round(item.abv, precision),
		brix: round(item.brix, precision),
		kcal: round(item.kcal, precision),
		proof: round(item.abv * 2, precision),
		equivalentSugarMass: round(item.equivalentSugarMass, precision)
	};
}

export function digitsForDisplay(value: number) {
	return value === 0 ? 0 : value < 1 ? 2 : value < 10 ? 1 : 0;
}

/**
 * Rounds a numeric value for display purposes based on its magnitude.
 *
 * - Values equal to 0 are returned as 0.
 * - Values less than 1 are rounded to two decimal places.
 * - Values between 1 and 10 are rounded to one decimal place.
 * - Values 10 and above are rounded to the nearest integer.
 *
 * Appends a hair space character to the formatted number.
 *
 * @param value - The numeric value to be rounded and formatted.
 * @returns The formatted string representation of the number with a hair space.
 */
export function roundForDisplay(
	value: number,
	whichSpace: 'thin' | 'hair' | 'normal' | 'none' = 'hair'
) {
	const formatted = value.toFixed(digitsForDisplay(value));
	const space =
		{
			thin: '\u2009',
			hair: '\u200A',
			normal: ' ',
			none: ''
		}[whichSpace] || '';
	return `${formatted}${space}`;
}
