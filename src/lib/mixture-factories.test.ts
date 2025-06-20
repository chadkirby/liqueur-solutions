import { describe, it, expect } from 'vitest';
import { citrusFactory, newSpirit, newSyrup, newZeroSyrup } from './mixture-factories.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import { getCitrusPrefix } from './ingredients/citrus-ids.js';

describe('newSpirit', () => {
	it('should work', () => {
		const spirit = newSpirit(100, 47.41192);
		expect(spirit.size, 'two ingredients').toBe(2);
		expect(spirit.volume, 'volume').toBeCloseTo(100);
		// 47.41192% ABV spirit has a weight percentage of 0.4, so we expect
		// the density to be 0.9352, which we have in the experimental
		// measurements
		expect(spirit.getDensity(), 'density').toBeCloseTo(0.9352);
		expect(spirit.abv, 'abv').toBeCloseTo(47.41192);
		expect(spirit.brix).toBe(0);
		expect(spirit.pH).toBe(7);
	});

	it('should maintain volume when ABV changes', () => {
		const spirit = newSpirit(100, 47.41192);
		expect(spirit.volume, 'initial volume').toBeCloseTo(100);
		spirit.setAbv(40);
		expect(spirit.volume, 'volume after ABV change').toBeCloseTo(100);
		expect(spirit.abv, 'abv after change').toBeCloseTo(40);
	});
});

describe('newSyrup', () => {
	it('should work', () => {
		// 100ml of 50 brix syrup should have 60.65g of sugar and 39.35g of water
		const syrup = newSyrup(100, 50);
		expect(syrup.size, 'two ingredients').toBe(2);
		expect(syrup.volume, 'volume').toBeCloseTo(100);
		expect(syrup.mass, 'mass').toBeCloseTo(121.3);
		expect(syrup.equivalentSugarMass, 'mass').toBeCloseTo(60.65, 1);
		expect(syrup.abv).toBe(0);
		expect(syrup.brix).toBe(50);
		expect(
			syrup
				.eachIngredient()
				.map(({ ingredient }) => syrup.getIngredientMass(ingredient.id).toFixed(2)),
			'masses',
		).toStrictEqual(['60.65', '60.65']);
		expect(
			syrup
				.eachIngredient()
				.map(({ ingredient: { id, item } }) =>
					item.getWaterVolume(syrup.getIngredientMass(id)).toFixed(2),
				),
			'waterVolumes',
		).toStrictEqual(['0.00', '60.65']);
	});
	it('should add ingredients properly', () => {
		const syrup = newSyrup(100, 50);
		expect(syrup.size, 'two ingredients').toBe(2);
		expect(syrup.mass, 'mass').toBeCloseTo(121.3);
		expect(syrup.equivalentSugarMass, 'mass').toBeCloseTo(60.65, 1);
		expect(syrup.volume, 'volume').toBe(100);
		expect(syrup.brix).toBe(50);
		expect(syrup.getDensity(), 'density').toBeCloseTo(1.213);
		syrup.addIngredient({
			name: 'water',
			mass: 60.65,
			item: SubstanceComponent.new('water'),
		});
		expect(syrup.size, 'three ingredients').toBe(3);
		expect(
			syrup
				.eachIngredient()
				.map(({ ingredient }) => syrup.getIngredientMass(ingredient.id).toFixed(2)),
			'masses',
		).toStrictEqual(['60.65', '60.65', '60.65']);
		expect(syrup.equivalentSugarMass, 'mass').toBeCloseTo(60.65, 1);
		expect(syrup.getDensity(), 'density').toBeCloseTo(1.13, 1);
		expect(syrup.mass, 'mass').toBeCloseTo(3 * 60.65);
		expect(syrup.volume, 'volume').toBeCloseTo(160.96, 1);
		expect(syrup.brix).toBeCloseTo(33.3333, 2);
	});
});

describe('Citrus', () => {
	it('lemon', () => {
		const juice = citrusFactory.lemon(100);
		expect(getCitrusPrefix(juice.id), 'prefix').toBe('__citrus-lemon__');
		expect(juice.volume, 'volume').toBeCloseTo(100);
		expect(juice.abv).toBe(0);
		expect(juice.brix).toBeCloseTo(3.1, 0);
	});
	it('lime', () => {
		const juice = citrusFactory.lime(100);
		expect(getCitrusPrefix(juice.id), 'prefix').toBe('__citrus-lime__');
		expect(juice.volume, 'volume').toBeCloseTo(100);
		expect(juice.abv).toBe(0);
		expect(juice.brix).toBeCloseTo(1.9, 1);
	});
	it('orange', () => {
		const juice = citrusFactory.orange(100);
		expect(getCitrusPrefix(juice.id), 'prefix').toBe('__citrus-orange__');
		expect(juice.volume, 'volume').toBeCloseTo(100);
		expect(juice.abv).toBe(0);
		expect(juice.brix, 'brix').toBeCloseTo(12.42, 1);
	});
	it('grapefruit', () => {
		const juice = citrusFactory.grapefruit(100);
		expect(getCitrusPrefix(juice.id), 'prefix').toBe('__citrus-grapefruit__');
		expect(juice.volume, 'volume').toBeCloseTo(100);
		expect(juice.abv).toBe(0);
		expect(juice.brix, 'brix').toBeCloseTo(8.78, 1);
	});
});

describe('zeroCal', () => {
	it('should work', () => {
		const zeroCal = newZeroSyrup(1000, 66.67);
		const substanceMap = zeroCal.makeSubstanceMap();
		expect(substanceMap.get('water')!.mass, 'mass').toBeCloseTo(906, 0);
		expect(substanceMap.get('allulose')!.mass, 'mass').toBeCloseTo(201, 0);
		expect(substanceMap.get('sucralose')!.mass, 'mass').toBeCloseTo(1, 1);
		expect(substanceMap.get('citric-acid')!.mass, 'mass').toBeCloseTo(1.3, 1);
		expect(substanceMap.get('sodium-citrate')!.mass, 'mass').toBeCloseTo(1.0, 1);
		expect(zeroCal.volume, 'volume').toBeCloseTo(1000);
		expect(zeroCal.equivalentSugarMass, 'mass').toBeCloseTo(741, 0);
		expect(zeroCal.brix, 'target brix').toBeCloseTo(66.67, 0);
	});
});
