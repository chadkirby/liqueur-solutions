import { describe, it, expect } from 'vitest';
import { calculateAqueousProportions, getDensity } from './density';

describe('calculateWaterEthanolProportions', () => {
	it('should handle pure water (0% ABV)', () => {
		const result = calculateAqueousProportions(0);
		expect(result.waterProportion).toBeCloseTo(1, 4);
		expect(result.substanceProportion).toBeCloseTo(0, 4);
		expect(result.density).toBeCloseTo(0.998, 3);
	});

	it('should handle pure ethanol (100% ABV)', () => {
		const result = calculateAqueousProportions(100);
		expect(result.waterProportion).toBeCloseTo(0, 4);
		expect(result.substanceProportion).toBeCloseTo(1, 4);
		expect(result.density).toBeCloseTo(0.789, 3);
	});

	it('should calculate correct proportions for 40% ABV', () => {
		const result = calculateAqueousProportions(40);
		expect(result.substanceProportion + result.waterProportion).toBeCloseTo(1, 4);
		expect(result.density).toBeGreaterThan(0.789); // Should be denser than pure ethanol
		expect(result.density).toBeLessThan(0.998); // Should be less dense than pure water
	});

	it('should throw error for invalid ABV values', () => {
		expect(() => calculateAqueousProportions(-1)).toThrow();
		expect(() => calculateAqueousProportions(101)).toThrow();
	});
});

describe('interpolateDensity', () => {
	it('should handle edge cases', () => {
		expect(getDensity(0)).toBeCloseTo(0.998, 3); // Pure water
		expect(getDensity(1)).toBeCloseTo(0.789, 3); // Pure ethanol
	});

	it('should interpolate between known values', () => {
		expect(getDensity(0.5)).toBeCloseTo(0.914, 3);
		expect(getDensity(0.25)).toBeLessThan(getDensity(0));
		expect(getDensity(0.75)).toBeGreaterThan(getDensity(1));
	});

	it('should throw error for invalid weight percentages', () => {
		expect(() => getDensity(-0.1)).toThrow();
		expect(() => getDensity(1.1)).toThrow();
	});
});
