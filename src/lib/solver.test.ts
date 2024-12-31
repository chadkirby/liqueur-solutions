import { describe, it, expect, beforeEach } from 'vitest';
import { Mixture } from './mixture.js';
import type { Analysis } from './utils.js';
import { solver, setVolume } from './solver.js';
import { newSpirit } from './mixture-factories.js';
import { SubstanceComponent } from './ingredients/index.js';

describe('Mixture', () => {
	let mixture: Mixture;
	let initialAnalysis: Analysis;

	beforeEach(() => {
		mixture = newSpirit(100, 40).addIngredient({
			name: 'sugar',
			mass: 50,
			component: SubstanceComponent.sucrose(50)
		});
		initialAnalysis = mixture.analyze(2);
	});

	it('should solve for abv', () => {
		// Act
		const result = solver(mixture, {
			pH: initialAnalysis.pH,
			abv: 50,
			brix: initialAnalysis.brix
		});

		// Assert
		expect(result.volume).toBeCloseTo(initialAnalysis.volume, 1);
		expect(result.abv).toBeCloseTo(50, 1);
		expect(result.brix).toBeCloseTo(initialAnalysis.brix, 1);
	});

	it('should solve for brix', () => {
		// Act
		const result = solver(mixture, {
			pH: initialAnalysis.pH,
			abv: initialAnalysis.abv,
			brix: 25
		});

		// Assert
		expect(result.volume).toBeCloseTo(initialAnalysis.volume, 1);
		expect(result.abv).toBeCloseTo(initialAnalysis.abv, 1);
		expect(result.brix).toBeCloseTo(25, 1);
	});

	it('should throw an error for unable to solve', () => {
		// Act & Assert
		expect(() => solver(mixture, { volume: null, abv: 200, brix: null })).toThrowError(
			'Target ABV must be between 0 and 100'
		);
	});
});

describe('setVolume', () => {
	it('should handle ethanol-water mixtures correctly', () => {
		// 40% ABV mixture
		const mixture = newSpirit(100, 40);

		setVolume(mixture, 50);

		// Volume should be exactly 50
		expect(mixture.volume).toBeCloseTo(50, 3);
		// Proportions should be maintained
		expect(mixture.alcoholVolume / (mixture.alcoholVolume + mixture.waterVolume)).toBeCloseTo(
			0.4,
			3
		);
	});

	it('should handle scaling up', () => {
		const mixture = newSpirit(50, 40);

		setVolume(mixture, 100);
		expect(mixture.volume).toBeCloseTo(100, 3);
	});

	it('should converge within 10 iterations', () => {
		let setMassCallCount = 0;
		const mixture = newSpirit(100, 40);

		setVolume(mixture, 50);
		expect(setMassCallCount).toBeLessThanOrEqual(10);
		expect(mixture.volume).toBeCloseTo(50, 3);
	});

	it('should handle tiny volume changes', () => {
		const mixture = newSpirit(100, 40);

		setVolume(mixture, 99.9);
		expect(mixture.volume).toBeCloseTo(99.9, 3);
	});
});
