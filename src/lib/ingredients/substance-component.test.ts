import { describe, it, expect } from 'vitest';

import { Substances } from './substances.js';
import { SubstanceComponent } from './index.js';

describe('SubstanceComponent', () => {
	it('should work ', () => {
		const component = SubstanceComponent.new('water');
		expect(component.substanceId).toBe('water');
		expect(component.name).toBe('Water');
		expect(component.getEquivalentSugarMass(50)).toBe(0);
		expect(component.getAlcoholMass(50)).toBe(0);
		expect(component.getAbv(50)).toBe(0);
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
