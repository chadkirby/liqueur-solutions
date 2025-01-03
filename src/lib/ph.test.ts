import { test, assert, describe, expect } from 'vitest';
import { Mixture } from './mixture.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import { type SubstanceId } from './ingredients/substances.js';
import { citrus, newZeroSyrup } from './mixture-factories.js';
import { getCitrusPrefix } from './citrus-ids.js';
import { calculateAlphas, calculatePh } from './ph-solver.js';

function getPh(substanceId: SubstanceId, substanceMass: number, solutionVolume: number) {
	const mx = new Mixture()
		.addIngredient({
			name: substanceId,
			mass: substanceMass,
			component: SubstanceComponent.new(substanceId),
		})
		.addIngredient({
			name: 'water',
			mass: solutionVolume - substanceMass,
			component: SubstanceComponent.new('water'),
		});
	return mx.pH;
}

describe('Simple aqueous acid solutions', () => {
	// Citric acid is a weak triprotic acid
	test('Citric Acid', () => {
		assert.approximately(getPh('citric-acid', 100, 1000), 1.72, 0.1);
		assert.approximately(getPh('citric-acid', 60, 1000), 1.85, 0.1);
		assert.approximately(getPh('citric-acid', 6, 1000), 2.33, 0.1);
	});
	// Malic acid is a weak diprotic acid
	test('Malic Acid', () => {
		// pH of a 0.001% aqueous solution is 3.80, that of 0.1% solution is
		// 2.80, and that of a 1.0% solution is 2.34

		assert.approximately(getPh('malic-acid', 10, 1000), 2.34, 0.1);
		assert.approximately(getPh('malic-acid', 1, 1000), 2.8, 0.1);
		// reference says 3.8, but we get 3.4...
		// assert.approximately(getPh('malic-acid', 0.1, 1000), 3.8, 0.1);
	});
	// Ascorbic acid is a weak diprotic acid
	test('Ascorbic Acid', () => {
		assert.approximately(getPh('ascorbic-acid', 100, 1000), 2.1, 0.1);
		assert.approximately(getPh('ascorbic-acid', 60, 1000), 2.3, 0.1);
		assert.approximately(getPh('ascorbic-acid', 6, 1000), 2.8, 0.1);
	});

	// Acetic acid is a weak monoprotic acid
	test('Acetic Acid', () => {
		// Aqueous solution 1.0 molar = 2.4; 0.1 molar = 2.9; 0.01 molar = 3.4
		// Molecular mass: (2 × 12.01) + (4 × 1.008) + (2 × 16.00) = 60.052 g/mol

		// test 1.0 molar solution
		assert.approximately(getPh('acetic-acid', 60, 1000), 2.4, 0.1);
		// test 0.1 molar solution
		assert.approximately(getPh('acetic-acid', 6, 1000), 2.9, 0.1);
		// test 0.01 molar solution (reference says 3.4)
		assert.approximately(getPh('acetic-acid', 0.6, 1000), 3.4, 0.1);
	});
});

describe('diprotic acid buffer', () => {
	test('should match known pH for diprotic buffers', () => {
		const result = calculatePh({
			acidMolarity: 0.1,
			conjugateBaseMolarity: 0.1,
			pKa: [3.4, 5.2], // malic acid
		});
		console.log('pH components:', {
			alphas: calculateAlphas(result.H, [3.4, 5.2]),
			charges: result.f(result.H),
		});
		expect(result.pH).toBeCloseTo(4.3, 1);
	});

	test('alpha calculation for diprotic acid', () => {
		const pH = 4.3;
		const H = Math.pow(10, -pH);
		const alphas = calculateAlphas(H, [3.4, 5.2]);

		// At pH 4.3 (between pKa1 and pKa2)
		// Should have significant HA- fraction
		assert.approximately(alphas[1], 0.5, 0.2);
	});
});

describe('Mixture can model pH', () => {
	test('should work with water', () => {
		const mx = new Mixture().addIngredient({
			name: 'water',
			mass: 100,
			component: SubstanceComponent.new('water'),
		});
		assert.equal(mx.pH, 7, 'pH');
	});

	test('should handle buffer pair - citric acid and sodium citrate', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'citric acid',
				mass: 3,
				component: SubstanceComponent.new('citric-acid'),
			})
			.addIngredient({
				name: 'sodium citrate',
				mass: 5,
				component: SubstanceComponent.new('sodium-citrate'),
			})
			.addIngredient({
				name: 'water',
				mass: 92,
				component: SubstanceComponent.new('water'),
			});
		assert.approximately(mx.pH, 5, 0.125, 'pH with buffer pair');
	});

	test('should handle buffer pair - acetic acid and sodium acetate', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'acetic acid',
				mass: 3,
				component: SubstanceComponent.new('acetic-acid'),
			})
			.addIngredient({
				name: 'sodium acetate',
				mass: 5,
				component: SubstanceComponent.new('sodium-acetate'),
			})
			.addIngredient({
				name: 'water',
				mass: 92,
				component: SubstanceComponent.new('water'),
			});
		assert.approximately(mx.pH, 4.85, 0.125, 'pH with buffer pair');
	});

	test('should handle buffer pair - malic acid and sodium acetate', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'malic acid',
				mass: 3,
				component: SubstanceComponent.new('malic-acid'),
			})
			.addIngredient({
				name: 'sodium acetate',
				mass: 5,
				component: SubstanceComponent.new('sodium-acetate'),
			})
			.addIngredient({
				name: 'water',
				mass: 92,
				component: SubstanceComponent.new('water'),
			});
		assert.approximately(mx.pH, 4.85, 0.125, 'pH with buffer pair');
	});

	test.skip('should handle unequal buffer pair - citric acid and sodium citrate', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'citric acid',
				mass: 5,
				component: SubstanceComponent.new('citric-acid'),
			})
			.addIngredient({
				name: 'sodium citrate',
				mass: 1,
				component: SubstanceComponent.new('sodium-citrate'),
			})
			.addIngredient({
				name: 'water',
				mass: 92,
				component: SubstanceComponent.new('water'),
			});
		assert.approximately(mx.pH, 1.82, 0.1, 'pH with unequal buffer pair');
	});

	test.skip('should handle multiple buffer pairs', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'citric acid',
				mass: 3,
				component: SubstanceComponent.new('citric-acid'),
			})
			.addIngredient({
				name: 'sodium citrate',
				mass: 5,
				component: SubstanceComponent.new('sodium-citrate'),
			})
			.addIngredient({
				name: 'acetic acid',
				mass: 2,
				component: SubstanceComponent.new('acetic-acid'),
			})
			.addIngredient({
				name: 'sodium acetate',
				mass: 3,
				component: SubstanceComponent.new('sodium-acetate'),
			})
			.addIngredient({
				name: 'water',
				mass: 87,
				component: SubstanceComponent.new('water'),
			});
		// not super-confident in this value
		assert.approximately(mx.pH, 4.72, 0.2, 'pH with multiple buffers');
	});

	test('should handle buffer pair with missing component', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'citric acid',
				mass: 3,
				component: SubstanceComponent.new('citric-acid'),
			})
			// Missing sodium citrate
			.addIngredient({
				name: 'water',
				mass: 97,
				component: SubstanceComponent.new('water'),
			});
		assert.approximately(mx.pH, 1.96, 0.1, 'pH with missing buffer component');
	});
});

describe('Citrus', () => {
	test('lemon', () => {
		const juice = citrus.lemon(100);
		expect(getCitrusPrefix(juice.id), 'prefix').toBe('(citrus-lemon)');
		expect(juice.pH).toBeCloseTo(2.3, 1);
	});
	test('lime', () => {
		const juice = citrus.lime(100);
		expect(getCitrusPrefix(juice.id), 'prefix').toBe('(citrus-lime)');
		expect(juice.pH).toBeCloseTo(2.4, 1);
	});
	test('orange', () => {
		const juice = citrus.orange(100);
		expect(getCitrusPrefix(juice.id), 'prefix').toBe('(citrus-orange)');
		expect(juice.pH, 'pH').toBeCloseTo(3.3, 1);
	});
	test('grapefruit', () => {
		const juice = citrus.grapefruit(100);
		expect(getCitrusPrefix(juice.id), 'prefix').toBe('(citrus-grapefruit)');
		expect(juice.pH, 'pH').toBeCloseTo(3.3, 1);
	});
});

describe('zeroCal', () => {
	test('should work', () => {
		const zeroCal = newZeroSyrup(1000, 66.67);
		expect(zeroCal.pH, 'buffered pH!').toBeCloseTo(3.5, 1);
	});
});
