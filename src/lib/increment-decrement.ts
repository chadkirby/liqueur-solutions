export type MinMax = { min?: number; max?: number };

/**
 * Increments the given number by a step size determined by its order
 * of magnitude.
 *
 * @param value - The number to be incremented.
 * @returns The incremented number.
 */
export function increment(value: number, { min = 0, max = Infinity }: MinMax = {}) {
	const step = findStep(value);
	return clamp(value + step, min, max);
}
export function decrement(value: number, { min = 0, max = Infinity }: MinMax = {}) {
	const step = findStep(value);
	return clamp(value - step, min, max);
}

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

/** return a power of 10 or 5 that close to 1% of the given value
 */
function findStep(value: number) {
	const step = Math.max(0.01, value * 0.01);
	const closest10 = Math.pow(10, Math.round(Math.log10(step)));
	if (step < 1) return closest10;
	const closest5 = Math.pow(5, Math.round(Math.log10(step)));
	const diff10 = Math.abs(closest10 - step);
	const diff5 = Math.abs(closest5 - step);
	return diff10 <= diff5 ? closest10 : closest5;
}
