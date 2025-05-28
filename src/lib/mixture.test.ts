import { test, assert, describe, expect } from 'vitest';
import { Mixture } from './mixture.js';
import { SubstanceComponent } from './ingredients/substance-component.js';

describe('mixture works', () => {
	test('empty mixture', () => {
		const mx = new Mixture();
		assert.equal(mx.size, 0, 'no ingredients');
		assert.equal(mx.getDensity(), 0, 'density');
		assert.equal(mx.volume, 0, 'volume');
		assert.equal(mx.mass, 0, 'mass');
		assert.equal(mx.abv, 0, 'abv');
		assert.equal(mx.equivalentSugarMass, 0, 'equivalentSugarMass');
		assert.equal(mx.brix, 0, 'brix');
		assert.equal(mx.pH, 7, 'pH');
	});

	test('can add one ingredient', () => {
		const mx = new Mixture();
		mx.addIngredient({
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		});
		assert.deepEqual(mx.makeSubstanceMap().get('water')?.mass, 100, 'water substance');
		assert.equal(mx.size, 1, 'one ingredient');
		assert.equal(mx.getDensity(), 1, 'density');
		assert.equal(mx.volume, 100, 'volume');
		assert.equal(mx.mass, 100, 'mass');
		assert.equal(mx.abv, 0, 'abv');
		assert.equal(mx.equivalentSugarMass, 0, 'equivalentSugarMass');
		assert.equal(mx.brix, 0, 'brix');
		assert.equal(mx.pH, 7, 'pH');
	});

	test('can add two ingredients', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'water',
				mass: 100,
				item: SubstanceComponent.new('water'),
			})
			.addIngredient({
				name: 'water',
				mass: 100,
				item: SubstanceComponent.new('water'),
			});

		assert.deepEqual(mx.makeSubstanceMap().get('water')!.mass, 200, 'water substance map');
		assert.deepEqual(mx.waterMass, 200, 'water ingredient mass');
		assert.equal(mx.size, 2, 'two ingredients');
	});

	test('can add sub-mixtures', () => {
		const mx0 = new Mixture().addIngredient({
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		});
		const mx1 = new Mixture().addIngredient({
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		});

		const mx = new Mixture()
			.addIngredient({ name: 'water 0', mass: 10, item: mx0 })
			.addIngredient({ name: 'water 1', mass: 10, item: mx1 });
		assert.equal(mx.substances.length, 2, 'two substances');

		assert.equal(mx.makeSubstanceMap().get('water')!.mass, 20, 'water substance map');
		assert.equal(mx.waterMass, 20, 'water ingredient mass');
		assert.equal(mx.size, 2, 'two ingredients');
	});

	test('can remove ingredient', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'water',
				mass: 100,
				item: SubstanceComponent.new('water'),
			})
			.addIngredient({
				name: 'water',
				mass: 100,
				item: SubstanceComponent.new('water'),
			});

		let mass = 200;
		let ingredientCount = 2;
		assert.equal(mx.size, ingredientCount, 'two ingredients');
		for (const id of mx.ingredientIds) {
			mx.removeIngredient(id);
			ingredientCount--;
			mass -= 100;
			assert.equal(mx.size, ingredientCount, `${ingredientCount} ingredients`);
			assert.equal(mx.mass, mass, 'water ingredient mass');
		}
	});

	test('can set mass', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'water',
				mass: 100,
				item: SubstanceComponent.new('water'),
			})
			.addIngredient({
				name: 'water',
				mass: 100,
				item: SubstanceComponent.new('water'),
			});

		mx.setIngredientMass(1000);
		assert.equal(mx.mass, 1000, 'mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 500, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 500, 'ingredient 2 mass');

		mx.setIngredientMass(0);
		assert.equal(mx.mass, 0, 'mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 0, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 0, 'ingredient 2 mass');

		mx.setIngredientMass(100);
		assert.equal(mx.mass, 100, 'mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 50, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 50, 'ingredient 2 mass');
	});

	test('can set volume', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'water',
				mass: 100,
				item: SubstanceComponent.new('water'),
			})
			.addIngredient({
				name: 'water',
				mass: 100,
				item: SubstanceComponent.new('water'),
			});

		mx.setVolume(1000);
		assert.equal(mx.volume, 1000, 'volume');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 500, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 500, 'ingredient 2 mass');

		mx.setVolume(0);
		assert.equal(mx.volume, 0, 'volume');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 0, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 0, 'ingredient 2 mass');

		mx.setVolume(100);
		assert.equal(mx.volume, 100, 'volume');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 50, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 50, 'ingredient 2 mass');
	});
});

test('can set ingredient mass', () => {
	const mx = new Mixture()
		.addIngredient({
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		});

	mx.setIngredientMass(500, mx.ingredientIds[0]);
	assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 500, 'ingredient 1 mass');
	assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 100, 'ingredient 2 mass');
	assert.equal(mx.mass, 600, 'mass');
});

test('can update from other mixture', () => {
	const mx0 = new Mixture()
		.addIngredient({
			name: 'water',
			mass: 10,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'sucrose',
			mass: 10,
			item: SubstanceComponent.new('sucrose'),
		});

	const mx1 = new Mixture()
		.addIngredient({
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'ethanol',
			mass: 100,
			item: SubstanceComponent.new('ethanol'),
		});

	mx0.updateFrom(mx1);
	assert.equal(mx0.abv, mx1.abv, 'abv');
	assert.equal(mx0.volume, mx1.volume, 'volume');
});

test('can getIngredientVolume', () => {
	const mx = new Mixture()
		.addIngredient({
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'ethanol',
			mass: 100,
			item: SubstanceComponent.new('ethanol'),
		});
	const [waterId, ethanolId] = mx.ingredientIds;
	assert.equal(mx.getIngredientVolume(waterId), 100, 'water volume');
	assert.equal(mx.getIngredientVolume(ethanolId), 100 / 0.7893, 'ethanol volume');
});

test('can getIngredientMass', () => {
	const mx = new Mixture()
		.addIngredient({
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'ethanol',
			mass: 100,
			item: SubstanceComponent.new('ethanol'),
		});
	const [waterId, ethanolId] = mx.ingredientIds;
	assert.equal(mx.getIngredientMass(waterId), 100, 'water mass');
	assert.equal(mx.getIngredientMass(ethanolId), 100, 'ethanol mass');
});

test('can clone', () => {
	const mx = new Mixture()
		.addIngredient({
			name: 'water',
			mass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'ethanol',
			mass: 100,
			item: SubstanceComponent.new('ethanol'),
		});
	const clone = mx.clone();
	assert.deepEqual(clone, mx, 'clone');
});

test('addIngredient preserves notes field', () => {
	const mixture = new Mixture();

	mixture.addIngredient({
		name: 'Ingredient with Notes',
		mass: 50,
		notes: 'Special instructions',
		item: SubstanceComponent.new('sucrose'),
	});

	const ingredient = mixture.ingredients[0];
	assert.strictEqual(ingredient.notes, 'Special instructions');
});

describe('Mixture with notes', () => {
	test('notes are preserved when serializing and deserializing ingredients', () => {
		const mixture = new Mixture();
		mixture.addIngredient({
			name: 'Test Ingredient',
			mass: 100,
			notes: 'This is a test note',
			item: SubstanceComponent.new('water'),
		});

		// Serialize and deserialize
		const data = mixture.serialize();
		const deserializedMixture = Mixture.deserialize(data[0][0], data);

		// Check if the notes are preserved
		const ingredient = deserializedMixture.ingredients[0];
		assert.strictEqual(ingredient.notes, 'This is a test note');
	});

	test('notes are preserved when cloning a mixture', () => {
		const mixture = new Mixture();
		mixture.addIngredient({
			name: 'Test Ingredient',
			mass: 100,
			notes: 'This is a test note',
			item: SubstanceComponent.new('water'),
		});

		const clone = mixture.clone();

		const ingredient = clone.findIngredient(() => true);
		assert.ok(ingredient, 'Ingredient should exist in the clone');
		assert.strictEqual(
			ingredient!.notes,
			'This is a test note',
			'Cloned ingredient notes should match original',
		);
	});
});

test('updateFrom preserves notes in ingredients', () => {
	const sourceMixture = new Mixture();
	sourceMixture.addIngredient({
		name: 'Source Ingredient',
		mass: 100,
		notes: 'Notes from source',
		item: SubstanceComponent.new('water'),
	});

	const targetMixture = new Mixture();
	targetMixture.updateFrom(sourceMixture);

	const ingredient = targetMixture.ingredients[0];
	assert.strictEqual(ingredient.notes, 'Notes from source');
});

test('replaceIngredient preserves notes when specified', () => {
	const mixture = new Mixture();
	mixture.addIngredient({
		id: 'original',
		name: 'Original',
		mass: 100,
		notes: 'Original notes',
		item: SubstanceComponent.new('water'),
	});

	const success = mixture.replaceIngredient('original', {
		name: 'Replacement',
		mass: 200,
		notes: 'New notes',
		item: SubstanceComponent.new('ethanol'),
	});

	assert.strictEqual(success, true);
	const replacedIngredient = mixture.ingredients[0];
	assert.strictEqual(replacedIngredient.notes, 'New notes');
});

test('replaceIngredient does not add notes when not specified', () => {
	const mixture = new Mixture();
	mixture.addIngredient({
		id: 'original',
		name: 'Original',
		mass: 100,
		notes: 'Original notes',
		item: SubstanceComponent.new('water'),
	});

	const success = mixture.replaceIngredient('original', {
		name: 'Replacement',
		mass: 200,
		item: SubstanceComponent.new('ethanol'),
	});

	assert.strictEqual(success, true);
	const replacedIngredient = mixture.ingredients[0];
	assert.strictEqual(replacedIngredient.notes, undefined);
});

test('empty notes field is preserved', () => {
	const mixture = new Mixture();
	mixture.addIngredient({
		name: 'Test',
		mass: 100,
		notes: '', // Empty string
		item: SubstanceComponent.new('water'),
	});

	const data = mixture.serialize();
	const deserializedMixture = Mixture.deserialize(data[0][0], data);

	const ingredient = deserializedMixture.ingredients[0];
	expect(ingredient.notes).toBe(''); // Should be empty string, not null/undefined
});

test('undefined notes field is handled correctly', () => {
	const mixture = new Mixture();
	mixture.addIngredient({
		name: 'Test',
		mass: 100,
		// No notes field
		item: SubstanceComponent.new('water'),
	});

	const data = mixture.serialize();
	const deserializedMixture = Mixture.deserialize(data[0][0], data);

	const ingredient = deserializedMixture.ingredients[0];
	expect(ingredient.notes).toBeUndefined();
});
