import { describe, it, expect, test, assert } from 'vitest';

import { Substances } from './substances.js';
import { SubstanceComponent } from './substance-component.js';

describe('SubstanceComponent', () => {
	it('should work ', () => {
		const component = SubstanceComponent.new('water');
		expect(component.substanceId).toBe('water');
		expect(component.name).toBe('Water');
		expect(component.getEquivalentSugarMass(50)).toBe(0);
		expect(component.getAlcoholMass(50)).toBe(0);
		expect(component.getAbv()).toBe(0);
	});
	it('should work with sucrose', () => {
		const component = SubstanceComponent.new('sucrose');
		expect(component.substanceId).toBe('sucrose');
		expect(component.name).toBe('Sucrose');
		expect(component.getEquivalentSugarMass(50)).toBe(50);
		expect(component.getAlcoholMass(50)).toBe(0);
	});
	it('should work with ethanol', () => {
		const component = SubstanceComponent.new('ethanol');
		expect(component.substanceId).toBe('ethanol');
		expect(component.name).toBe('Ethanol');
		expect(component.getEquivalentSugarMass(39.5)).toBe(0);
		expect(component.getAlcoholMass(39.5)).toBeCloseTo(39.5, 1);
	});
	it('should compute pH', () => {
		for (const substance of Substances) {
			const component = SubstanceComponent.new(substance.id);
			if (substance.pKa.length === 0) {
				expect(component.getPH(1), `${substance.name} is not acidic`).toBe(7);
			} else {
				console.log(substance.name, 'pH =', component.getPH(1).toFixed(2));
				expect(component.getPH(1), `${substance.name}.pH `).not.toBeNaN();
			}
		}
	});
});

describe('Substances', () => {
	test('Waterworks', () => {
		const water = SubstanceComponent.new('water');
		assert.equal(water.name, 'Water', 'name');
		assert.equal(water.getEquivalentSugarMass(50), 0, 'getEquivalentSugarMass');
		assert.equal(water.getWaterVolume(50), 50, 'getWaterVolume');
		assert.equal(water.getWaterMass(50), 50, 'getWaterMass');
		assert.equal(water.getAlcoholMass(50), 0, 'getAlcoholMass');
		assert.equal(water.getAlcoholVolume(50), 0, 'getAlcoholVolume');
		assert.equal(water.getAbv(), 0, 'getAbv');
		assert.equal(water.getProof(), 0, 'getProof');
		assert.equal(water.getBrix(), 0, 'getBrix');
		assert.equal(water.getPH(1), 7, 'getPH');
		assert.equal(water.pureDensity, 1, 'pureDensity');
		assert.equal(water.isValid, true, 'isValid');
		assert.equal(water.partialSolutionDensity(1), 1, 'partialSolutionDensity');
		assert.equal(water.getKcal(1), 0, 'getKcal');
		assert.approximately(water.getMoles(1), 0.05551, 0.00001, 'getMolarity');
		assert.equal(water.describe(), 'Water', 'describe');
	});

	test('Sucrose works', () => {
		const sucrose = SubstanceComponent.new('sucrose');
		assert.equal(sucrose.name, 'Sucrose', 'name');
		assert.equal(sucrose.getEquivalentSugarMass(50), 50, 'getEquivalentSugarMass');
		assert.equal(sucrose.getWaterVolume(50), 0, 'getWaterVolume');
		assert.equal(sucrose.getWaterMass(50), 0, 'getWaterMass');
		assert.equal(sucrose.getAlcoholMass(50), 0, 'getAlcoholMass');
		assert.equal(sucrose.getAlcoholVolume(50), 0, 'getAlcoholVolume');
		assert.equal(sucrose.getAbv(), 0, 'getAbv');
		assert.equal(sucrose.getProof(), 0, 'getProof');
		assert.equal(sucrose.getBrix(), 100, 'getBrix');
		assert.equal(sucrose.getPH(1), 7, 'getPH');
		assert.equal(sucrose.pureDensity, 1.5875, 'pureDensity');
		assert.equal(sucrose.isValid, true, 'isValid');
		assert.equal(sucrose.getKcal(1), 3.87, 'getKcal');
		assert.approximately(sucrose.getMoles(1), 0.0029214, 0.00001, 'getMolarity');
		assert.equal(sucrose.describe(), 'Sucrose', 'describe');
	});
});
