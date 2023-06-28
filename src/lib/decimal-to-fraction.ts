export function decimalToFraction(decimal: number): string {
	const wholePart = Math.floor(decimal);
	const fractionalPart = decimal - wholePart;
	const fractionDenominator = 16;
	const closestNumerator = Math.round(fractionalPart * fractionDenominator);
	const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
	const divisor = gcd(closestNumerator, fractionDenominator);
	const numerator = closestNumerator / divisor;
	const denominator = fractionDenominator / divisor;

	const frac = numerator === 0 || numerator === 16 ? '' : `${numerator}⁄${denominator}`;

	if (wholePart === 0 && frac === '') {
		return '0';
	} else if (numerator === denominator) {
		return `${wholePart + 1}`;
	} else if (wholePart === 0) {
		return `${frac}`;
	} else if (frac === '') {
		return `${wholePart}`;
	} else {
		// eslint-disable-next-line no-irregular-whitespace
		return `${wholePart} ${frac}`;
	}
}
