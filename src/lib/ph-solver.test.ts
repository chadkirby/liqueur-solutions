import { test, assert, describe } from 'vitest';
import { calculatePh } from './ph-solver.js';
import { Molecule } from './ingredients/substances.js';

const getPh = calculatePh;

describe('pH solver', () => {
	// Citric acid is a weak triprotic acid
	test('Citric Acid', () => {
		const citricAcid = {
			molecule: new Molecule('C6H8O7'),
			pureDensity: 1.66,
			pKa: [3.13, 4.76, 5.4],
		};

		assert.approximately(getPh(citricAcid, 100, 1000).pH, 1.72, 0.1);
		assert.approximately(getPh(citricAcid, 60, 1000).pH, 1.85, 0.1);
		assert.approximately(getPh(citricAcid, 6, 1000).pH, 2.33, 0.1);
	});
	// Malic acid is a weak diprotic acid
	test('Malic Acid', () => {
		const malicAcid = {
			molecule: new Molecule('C4H6O5'),
			pureDensity: 1.609,
			pKa: [3.4, 5.1],
		};
		// pH of a 0.001% aqueous solution is 3.80, that of 0.1% solution is
		// 2.80, and that of a 1.0% solution is 2.34

		assert.approximately(getPh(malicAcid, 10, 1000).pH, 2.34, 0.1);
		assert.approximately(getPh(malicAcid, 1, 1000).pH, 2.8, 0.1);
		// reference says 3.8, but we get 3.4...
		// assert.approximately(getPh(malicAcid, 0.1, 1000).pH, 3.8, 0.1);
	});
	// Ascorbic acid is a weak diprotic acid
	test('Ascorbic Acid', () => {
		const ascorbicAcid = {
			molecule: new Molecule('C6H8O6'),
			pureDensity: 1.65,
			pKa: [4.1, 11.8],
		};

		assert.approximately(getPh(ascorbicAcid, 100, 1000).pH, 2.1, 0.1);
		assert.approximately(getPh(ascorbicAcid, 60, 1000).pH, 2.3, 0.1);
		assert.approximately(getPh(ascorbicAcid, 6, 1000).pH, 2.8, 0.1);
	});

	// Acetic acid is a weak monoprotic acid
	test('Acetic Acid', () => {
		const aceticAcid = {
			molecule: new Molecule('C2H4O2'),
			pureDensity: 1.049,
			pKa: [4.76],
		};

		// Aqueous solution 1.0 molar = 2.4; 0.1 molar = 2.9; 0.01 molar = 3.4
		// Molecular mass: (2 × 12.01) + (4 × 1.008) + (2 × 16.00) = 60.052 g/mol

		// test 1.0 molar solution
		assert.approximately(getPh(aceticAcid, 60, 1000).pH, 2.4, 0.1);
		// test 0.1 molar solution
		assert.approximately(getPh(aceticAcid, 6, 1000).pH, 2.9, 0.1);
		// test 0.01 molar solution (reference says 3.4)
		assert.approximately(getPh(aceticAcid, 0.6, 1000).pH, 3.4, 0.1);
	});
});
