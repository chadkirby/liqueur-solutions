import { describe, it, expect, beforeEach } from 'vitest';
import { Water } from './water.js';
import type { Analysis } from './utils.js';
import { MixtureStore } from './mixture-store.svelte.js';
import { newSpirit } from './mixture.js';
import { Sweetener } from './sweetener.js';

describe('Mixture', () => {
	let store: MixtureStore;
	let initialAnalysis: Analysis;

	beforeEach(() => {
		store = new MixtureStore();
		store.addComponentTo(null, { name: 'spirit', component: newSpirit(50, 100) });
		store.addComponentTo(null, { name: 'water', component: new Water(50) });
		store.addComponentTo(null, { name: 'sugar', component: new Sweetener('sucrose', 50) });
		initialAnalysis = store.mixture.analyze(2);
	});

	it('should solve for volume', () => {
		// Act
		store.solveTotal('volume', 200);

		// Assert
		expect(store.getVolume('totals')).toBeCloseTo(200, 0);
		expect(store.getAbv('totals')).toBeCloseTo(initialAnalysis.abv, 1);
		expect(store.getBrix('totals')).toBeCloseTo(initialAnalysis.brix, 1);
	});

	it('should solve for abv', () => {
		// Act
		store.solveTotal('abv', 50);

		// Assert
		expect(store.getVolume('totals')).toBeCloseTo(initialAnalysis.volume, 1);
		expect(store.getAbv('totals')).toBeCloseTo(50, 1);
		expect(store.getBrix('totals')).toBeCloseTo(initialAnalysis.brix, 1);
	});

	it('should solve for brix', () => {
		// Act
		store.solveTotal('brix', 25);

		// Assert
		expect(store.getVolume('totals')).toBeCloseTo(initialAnalysis.volume, 1);
		expect(store.getAbv('totals')).toBeCloseTo(initialAnalysis.abv, 1);
		expect(store.getBrix('totals')).toBeCloseTo(25, 1);
	});

	it('should throw an error for unable to solve', () => {
		// Act & Assert
		expect(() => store.solveTotal('abv', 200)).toThrowError('Unable to solve for abv = 200');
	});
});
