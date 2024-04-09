import { describe, it, expect, beforeEach } from 'vitest';
import { Mixture } from './mixture.js';
import { Water } from './water.js';
import { Sugar } from './sugar.js';
import type { Analysis } from './utils.js';
import { Spirit } from './spirit.js';

describe('Mixture', () => {
	let mixture: Mixture;
	let initialAnalysis: Analysis;

	beforeEach(() => {
		mixture = new Mixture();
		mixture.addComponent({ name: 'spirit', component: new Spirit(50, 100) });
		mixture.addComponent({ name: 'water', component: new Water(50) });
		mixture.addComponent({ name: 'sugar', component: new Sugar(50) });
		initialAnalysis = mixture.analyze(2);
		console.log('initialAnalysis', initialAnalysis);
	});

	it('should solve for volume', () => {
		// Act
		mixture.solveTotal('volume', 200);

		// Assert
		expect(mixture.get('volume')).toBeCloseTo(200, 0);
		expect(mixture.get('abv')).toBeCloseTo(initialAnalysis.abv, 1);
		expect(mixture.get('brix')).toBeCloseTo(initialAnalysis.brix, 1);
	});

	it('should solve for abv', () => {
		// Act
		mixture.solveTotal('abv', 50);

		// Assert
		expect(mixture.get('volume')).toBeCloseTo(initialAnalysis.volume, 1);
		expect(mixture.get('abv')).toBeCloseTo(50, 1);
		expect(mixture.get('brix')).toBeCloseTo(initialAnalysis.brix, 1);
	});

	it('should solve for brix', () => {
		// Act
		mixture.solveTotal('brix', 25);

		// Assert
		expect(mixture.get('volume')).toBeCloseTo(initialAnalysis.volume, 1);
		expect(mixture.get('abv')).toBeCloseTo(initialAnalysis.abv, 1);
		expect(mixture.get('brix')).toBeCloseTo(25, 1);
	});

	it('should throw an error for unable to solve', () => {
		// Act & Assert
		expect(() => mixture.solveTotal('abv', 0)).toThrowError('Unable to solve for abv = 0');
	});
});
