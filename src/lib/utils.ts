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
	return value === 0 ? 0 : value <= 1 ? 2 : value < 10 ? 1 : 0;
}

export type VolumeUnit = 'l' | 'ml' | 'fl_oz' | 'tsp' | 'tbsp' | 'cups';
export type MassUnit = 'kg' | 'g' | 'mg' | 'lb' | 'oz';
export type OtherUnit = '%' | 'proof' | 'brix' | 'kcal';

export type FormatOptions = {
	decimal?: 'fraction' | 'decimal';
	unit?: VolumeUnit | MassUnit | OtherUnit | '';
};

export const thinsp = '\u2009';
function suffixForUnit(unit: VolumeUnit | MassUnit | OtherUnit) {
	switch (unit) {
		case 'fl_oz':
			return `fl.${thinsp}oz`;
		case 'brix':
			return 'ºBx';
		default:
			return unit;
	}
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
export function format(value: number | string, options: FormatOptions = {}) {
	if (typeof value === 'string') {
		return Object.assign(new String(value), { value, suffix: '' });
	}
	const formatted =
		options.decimal === 'fraction'
			? convertToFraction(value)
			: value.toFixed(digitsForDisplay(value) + (options.unit === '%' ? 1 : 0));
	const suffix = options.unit ? `${thinsp}${suffixForUnit(options.unit)}` : '';
	const str = Object.assign(new String(`${formatted}${suffix}`), {
		value: formatted,
		suffix
	});
	return str;
}

export function convertToFraction(input: number): string {
	const integer = Math.floor(input);
	const decimal = input - integer;

	// Find the closest denominator
	for (const denominator of [2, 4, 8]) {
		const numerator = Math.round(decimal * denominator);
		const delta = Math.abs(decimal - numerator / denominator);
		// if the delta is less then 1/16, return the fraction
		if (numerator > 0 && delta < 0.0625) {
			return numerator < denominator
				? `${integer}${thinsp}${getUnicodeFraction(numerator, denominator)}`
				: `${integer + 1}`;
		}
	}
	return integer.toString();
}
/**
 * Return the unicode character for a fraction
 *
 * @param   {number}  numerator
 * @param   {number}  denominator
 *
 * @return  {string} the unicode fraction character
 */
function getUnicodeFraction(numerator: number, denominator: number) {
	const fractions: Record<string, string> = {
		// 		⅛
		// VULGAR FRACTION ONE EIGHTH
		// Unicode: U+215B, UTF-8: E2 85 9B
		'1/8': '\u215B',
		// 		¼
		// VULGAR FRACTION ONE QUARTER
		// Unicode: U+00BC, UTF-8: C2 BC
		'1/4': '\u00BC',
		// 		⅜
		// VULGAR FRACTION THREE EIGHTHS
		// Unicode: U+215C, UTF-8: E2 85 9C
		'3/8': '\u215C',
		// 		½
		// VULGAR FRACTION ONE HALF
		// Unicode: U+00BD, UTF-8: C2 BD
		'1/2': '\u00BD',
		// 		⅝
		// VULGAR FRACTION FIVE EIGHTHS
		// Unicode: U+215D, UTF-8: E2 85 9D
		'5/8': '\u215D',
		// 		¾
		// VULGAR FRACTION THREE QUARTERS
		// Unicode: U+00BE, UTF-8: C2 BE
		'3/4': '\u00BE',
		// 		⅞
		// VULGAR FRACTION SEVEN EIGHTHS
		// Unicode: U+215E, UTF-8: E2 85 9E
		'7/8': '\u215E'
	};

	return fractions[`${numerator}/${denominator}`] ?? `${numerator}⁄${denominator}`;
}

const candidates = [
	xToY(1, 1),
	xToY(5, 4),
	xToY(4, 3),
	xToY(3, 2),
	xToY(5, 3),
	xToY(2, 1),
	xToY(7, 3),
	xToY(5, 2),
	xToY(3, 1),
	xToY(4, 1),
	xToY(5, 1),
	xToY(6, 1),
	xToY(7, 1),
	xToY(8, 1),
	xToY(9, 1),
	xToY(10, 1)
];
export function brixToSyrupProportion(brix: number) {
	const diffs = candidates.map((x) => Math.abs(brix / 100 - x.decimal));
	const min = Math.min(...diffs);
	return candidates[diffs.indexOf(min)].ratio;
}

function xToY(x: number, y: number) {
	return { ratio: `${x}:${y}`, decimal: x / (x + y) };
}
