import { describe, it, expect } from 'vitest';
import { calculateAbvProportions } from './density.js';
import { Substances } from './substances.js';
import { SubstanceComponent } from './substance-component.js';

const ethanol = new SubstanceComponent(Substances.find((substance) => substance.id === 'ethanol')!);
function getSolutionDensity(weightPercentage: number) {
	return ethanol.partialSolutionDensity(weightPercentage);
}

describe('calculateWaterEthanolProportions', () => {
	it('should handle pure water (0% ABV)', () => {
		const result = calculateAbvProportions(0, 100);
		expect(result.waterMass).toBeCloseTo(1, 4);
		expect(result.ethanolMass).toBeCloseTo(0, 4);
	});

	it('should handle pure ethanol (100% ABV)', () => {
		const result = calculateAbvProportions(100, 1000);
		expect(result.waterMass).toBeCloseTo(0, 2);
		expect(result.ethanolMass).toBeCloseTo(1, 2);
	});

	it('should calculate correct proportions for 40% ABV', () => {
		const result = calculateAbvProportions(40, 100);
		expect(result.ethanolMass + result.waterMass).toBeCloseTo(1, 4);
	});

	it('should throw error for invalid ABV values', () => {
		expect(() => calculateAbvProportions(-1, 100)).toThrow();
		expect(() => calculateAbvProportions(110, 1001)).toThrow();
	});
});

describe('interpolateDensity', () => {
	it('should handle edge cases', () => {
		expect(getSolutionDensity(0)).toBeCloseTo(0.998 - 1, 2); // Pure water
		expect(getSolutionDensity(1)).toBeCloseTo(0.789 - 1, 3); // Pure ethanol
	});

	it('should interpolate between known values', () => {
		expect(getSolutionDensity(0.5)).toBeCloseTo(0.914 - 1, 3);
		expect(getSolutionDensity(0.25)).toBeLessThan(getSolutionDensity(0));
		expect(getSolutionDensity(0.75)).toBeGreaterThan(getSolutionDensity(1));
	});

	it('should clip invalid weight percentages', () => {
		expect(getSolutionDensity(-0.1)).toBeCloseTo(0);
		expect(getSolutionDensity(1.1)).toBeCloseTo(0.789 - 1);
	});
});
