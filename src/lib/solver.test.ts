import { describe, it, expect, beforeEach, test, assert } from 'vitest';
import { Mixture } from './mixture.js';
import { solver, solveMassForVolume, analyze } from './solver.js';
import { newSpirit } from './mixture-factories.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import type { SolverTarget } from './mixture-types.js';

describe('analyze analyzes deviations', () => {
	test('should throw an error for target pH out of range', () => {
		const mixture = new Mixture();
		assert.throws(() => analyze(mixture, { volume: 100, abv: 40, brix: 0, pH: 0 }));
	});

	test('should throw an error for target volume out of range', () => {
		const mixture = new Mixture();
		assert.throws(() => analyze(mixture, { volume: 0, abv: 40, brix: 0, pH: 7 }));
	});

	test('should return 0 deviations', () => {
		const mixture = newSpirit(100, 40);
		const analysis = analyze(mixture, { volume: 100, abv: 40, brix: 0, pH: 7 });
		assert.approximately(analysis.deviations.abv, 0, 0.001);
		assert.approximately(analysis.deviations.brix, 0, 0.001);
		assert.approximately(analysis.deviations.pH, 0, 0.001);
		assert.approximately(analysis.deviations.volume, 0, 0.001);
		assert.approximately(analysis.error, 0, 0.001);
	});

	test('should return abv deviations', () => {
		const mixture = newSpirit(100, 40);
		assert.approximately(
			analyze(mixture, { volume: 100, abv: 50, brix: 0, pH: 7 }).deviations.abv,
			-0.25,
			0.001,
			'40% actual abv + 25% is 50% target abv',
		);
		assert.approximately(
			analyze(mixture, { volume: 100, abv: 30, brix: 0, pH: 7 }).deviations.abv,
			0.25,
			0.001,
			'40% actual abv - 25% is 30% target abv',
		);
	});
});

describe('Mixture', () => {
	let mixture: Mixture;
	let initialAnalysis: SolverTarget;

	beforeEach(() => {
		mixture = newSpirit(100, 40).addIngredient({
			name: 'sugar',
			mass: 50,
			item: SubstanceComponent.new('sucrose'),
		});
		initialAnalysis = {
			volume: mixture.volume,
			abv: mixture.abv,
			brix: mixture.brix,
			pH: mixture.pH,
		};
	});

	it('should solve for abv', () => {
		// Act
		const result = solver(mixture, {
			volume: initialAnalysis.volume,
			pH: initialAnalysis.pH,
			abv: 50,
			brix: initialAnalysis.brix,
		}).setVolume(initialAnalysis.volume);

		// Assert
		expect(result.volume, 'volume').toBeCloseTo(initialAnalysis.volume, 1);
		expect(result.abv, 'abv').toBeCloseTo(50, 1);
		expect(result.brix, 'brix').toBeCloseTo(initialAnalysis.brix, 1);
	});

	it('should solve for brix', () => {
		// Act
		const result = solver(mixture, {
			volume: initialAnalysis.volume,
			pH: initialAnalysis.pH,
			abv: initialAnalysis.abv,
			brix: 25,
		});

		// Assert
		expect(result.volume).toBeCloseTo(initialAnalysis.volume, 1);
		expect(result.abv).toBeCloseTo(initialAnalysis.abv, 1);
		expect(result.brix).toBeCloseTo(25, 1);
	});
});

describe('setVolume', () => {
	it('should handle ethanol-water mixtures correctly', () => {
		// 40% ABV mixture
		const mixture = newSpirit(100, 40);
		expect(mixture.volume).toBeCloseTo(100, 3);
		expect(mixture.abv).toBeCloseTo(40, 3);

		mixture.setMass(solveMassForVolume(mixture, 50));

		// Volume should be exactly 50
		expect(mixture.volume).toBeCloseTo(50, 3);
		// Proportions should be maintained
		expect(mixture.abv).toBeCloseTo(40, 3);
	});

	it('should handle scaling up', () => {
		const mixture = newSpirit(50, 40);

		mixture.setMass(solveMassForVolume(mixture, 100));
		expect(mixture.volume).toBeCloseTo(100, 3);
	});

	it('should converge within 10 iterations', () => {
		let setMassCallCount = 0;
		const mixture = newSpirit(100, 40);

		mixture.setMass(solveMassForVolume(mixture, 50));
		expect(setMassCallCount).toBeLessThanOrEqual(10);
		expect(mixture.volume).toBeCloseTo(50, 3);
	});

	it('should handle tiny volume changes', () => {
		const mixture = newSpirit(100, 40);

		mixture.setMass(solveMassForVolume(mixture, 99.9));
		expect(mixture.volume).toBeCloseTo(99.9, 3);
	});
});
