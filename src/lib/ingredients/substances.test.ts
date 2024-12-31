import { describe, it, expect } from 'vitest';

import { Substances, Molecule } from './substances.js';

describe('Molecule', () => {
	it('should calculate mass', () => {
		// water
		expect(new Molecule('H2O').molecularMass, 'water').toBeCloseTo(18.015, 1);

		// ethanol
		expect(new Molecule('C2H5OH').molecularMass, 'ethanol').toBeCloseTo(46.069, 1);

		// sucrose
		expect(new Molecule('C12H22O11').molecularMass, 'sucrose').toBeCloseTo(342.296, 1);

		// citric acid
		expect(new Molecule('C6 H8 O7').molecularMass, 'citric acid').toBeCloseTo(192.124, 1);

		// allulose
		expect(new Molecule('C6H12O6').molecularMass, 'allulose').toBeCloseTo(180.156, 1);

		// fructose
		expect(new Molecule('C6H12O6').molecularMass, 'fructose').toBeCloseTo(180.156, 1);

		// erythritol
		expect(new Molecule('C4H10O4').molecularMass, 'erythritol').toBeCloseTo(122.118, 1);
	});
});

describe('Substances', () => {
	it('should have valid values', () => {
		for (const substance of Substances) {
			expect(substance.id, 'id is string').toBeTypeOf('string');
			expect(substance.molecule, 'molecule is molecule').toBeInstanceOf(Molecule);
			expect(substance.sweetness, 'sweetness').toBeTypeOf('number');
			expect(substance.kcal).toBeTypeOf('number');
			expect(substance.pKa).toSatisfy(Array.isArray);
		}
	});
	it('should have unique IDs', () => {
		const ids = new Set();
		for (const substance of Substances) {
			expect(ids.has(substance.id), 'unique ID').toBeFalsy();
			ids.add(substance.id);
		}
	});
});
