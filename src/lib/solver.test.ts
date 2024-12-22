import { describe, it, expect, beforeEach } from 'vitest';
import { Mixture, newSpirit } from './mixture.js';
import { Water } from './components/water.js';
import type { Analysis } from './utils.js';
import { Sweetener } from './components/sweetener.js';
import { solver } from './solver.js';

describe('Mixture', () => {
	let mixture: Mixture;
	let initialAnalysis: Analysis;

	beforeEach(() => {
		mixture = new Mixture();
		mixture.addComponent({ name: 'spirit', id: 'spirit', component: newSpirit(50, 95) });
		mixture.addComponent({ name: 'water', id: 'water', component: new Water(50) });
		mixture.addComponent({ name: 'sugar', id: 'sugar', component: new Sweetener('sucrose', 50) });
		initialAnalysis = mixture.analyze(2);
	});

	it('should solve for volume', () => {
		// Act
		const result = solver(mixture, { volume: 200, abv: null, brix: null });

		// Assert
		expect(result.volume).toBeCloseTo(200, 0);
		expect(result.abv).toBeCloseTo(initialAnalysis.abv, 1);
		expect(result.brix).toBeCloseTo(initialAnalysis.brix, 1);
	});

	it('should solve for abv', () => {
		// Act
		const result = solver(mixture, {
			volume: initialAnalysis.volume,
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
			volume: initialAnalysis.volume,
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
