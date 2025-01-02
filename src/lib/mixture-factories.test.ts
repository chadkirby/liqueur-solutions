import { describe, it, expect } from 'vitest';
import {
	isCitrus,
	isGrapefruit,
	isLemon,
	isLime,
	isOrange,
	newGrapefruit,
	newLemon,
	newLime,
	newOrange,
	newSpirit,
	newSyrup,
} from './mixture-factories.js';
import { SubstanceComponent } from './ingredients/substance-component.js';

describe('newSpirit', () => {
	it('should work', () => {
		const spirit = newSpirit(100, 47.41192);
		expect(spirit.ingredients.size, 'two ingredients').toBe(2);
		expect(spirit.volume, 'volume').toBeCloseTo(100);
		// 47.41192% ABV spirit has a weight percentage of 0.4, so we expect
		// the density to be 0.9352, which we have in the experimental
		// measurements
		expect(spirit.density(), 'density').toBeCloseTo(0.9352);
		expect(spirit.abv, 'abv').toBeCloseTo(47.41192);
		expect(spirit.brix).toBe(0);
		expect(spirit.pH).toBe(7);
	});
});

describe('newSyrup', () => {
	it('should work', () => {
		// 100ml of 50 brix syrup should have 60.65g of sugar and 39.35g of water
		const syrup = newSyrup(100, 50);
		expect(syrup.ingredients.size, 'two ingredients').toBe(2);
		expect(syrup.volume, 'volume').toBeCloseTo(100);
		expect(syrup.mass, 'mass').toBeCloseTo(121.3);
		expect(syrup.equivalentSugarMass, 'mass').toBeCloseTo(60.65, 1);
		expect(syrup.abv).toBe(0);
		expect(syrup.brix).toBe(50);
		expect(
			[...syrup.ingredients].map((i) => syrup.getIngredientMass(i[0]).toFixed(2)),
			'masses',
		).toStrictEqual(['60.65', '60.65']);
		expect(
			[...syrup.ingredients].map((i) => syrup.get(i[1], 'waterVolume').toFixed(2)),
			'waterVolumes',
		).toStrictEqual(['0.00', '60.65']);
	});
	it('should add ingredients properly', () => {
		const syrup = newSyrup(100, 50);
		expect(syrup.ingredients.size, 'two ingredients').toBe(2);
		expect(syrup.mass, 'mass').toBeCloseTo(121.3);
		expect(syrup.equivalentSugarMass, 'mass').toBeCloseTo(60.65, 1);
		expect(syrup.volume, 'volume').toBe(100);
		expect(syrup.brix).toBe(50);
		expect(syrup.density(), 'density').toBeCloseTo(1.213);
		syrup.addIngredient({
			name: 'water',
			mass: 60.65,
			component: SubstanceComponent.new('water'),
		});
		expect(syrup.ingredients.size, 'three ingredients').toBe(3);
		expect(
			[...syrup.ingredients].map((i) => syrup.getIngredientMass(i[0]).toFixed(2)),
			'masses',
		).toStrictEqual(['60.65', '60.65', '60.65']);
		expect(syrup.equivalentSugarMass, 'mass').toBeCloseTo(60.65, 1);
		expect(syrup.density(), 'density').toBeCloseTo(1.13, 1);
		expect(syrup.mass, 'mass').toBeCloseTo(3 * 60.65);
		expect(syrup.volume, 'volume').toBeCloseTo(160.96, 1);
		expect(syrup.brix).toBeCloseTo(33.3333, 2);
	});
});

describe('Citrus', () => {
	it('lemon', () => {
		const juice = newLemon(100);
		expect(juice.volume, 'volume').toBeCloseTo(100);
		expect(juice.abv).toBe(0);
		expect(juice.brix).toBeCloseTo(3.1, 0);
		expect(juice.pH).toBeCloseTo(2.4, 0);
		expect(isCitrus(juice)).toBe(true);
		expect(isLemon(juice)).toBe(true);
		expect(isLemon(juice.updateIds())).toBe(true);
	});
	it('lime', () => {
		const juice = newLime(100);
		expect(juice.volume, 'volume').toBeCloseTo(100);
		expect(juice.abv).toBe(0);
		expect(juice.brix).toBeCloseTo(1.9, 0);
		expect(juice.pH).toBeCloseTo(2.4, 0);
		expect(isLemon(juice)).toBe(false);
		expect(isLime(juice)).toBe(true);
		expect(isLime(juice.updateIds())).toBe(true);
	});
	it('orange', () => {
		const juice = newOrange(100);
		expect(juice.volume, 'volume').toBeCloseTo(100);
		expect(juice.abv).toBe(0);
		expect(juice.brix, 'brix').toBeCloseTo(12.35, 0);
		expect(juice.pH, 'pH').toBeCloseTo(3.3, 0);
		expect(isCitrus(juice)).toBe(true);
		expect(isOrange(juice)).toBe(true);
	});
	it('grapefruit', () => {
		const juice = newGrapefruit(100);
		expect(juice.volume, 'volume').toBeCloseTo(100);
		expect(juice.abv).toBe(0);
		expect(juice.brix, 'brix').toBeCloseTo(8.78, 0);
		expect(juice.pH, 'pH').toBeCloseTo(3.3, 0);
		expect(isCitrus(juice)).toBe(true);
		expect(isGrapefruit(juice)).toBe(true);
	});
});
