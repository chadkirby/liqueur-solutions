import { test, assert, describe } from 'vitest';
import { Mixture } from './mixture.js';
import { SubstanceComponent } from './ingredients/substance-component.js';

describe('mixture works', () => {
	test('empty mixture', () => {
		const mx = new Mixture();
		assert.equal(mx.ingredients.size, 0, 'no ingredients');
		assert.equal(mx.density(), 0, 'density');
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
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		});
		assert.deepEqual(mx.makeSubstanceMap().get('water')?.mass, 100, 'water substance');
		assert.equal(mx.ingredients.size, 1, 'one ingredient');
		assert.equal(mx.density(), 1, 'density');
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
				desiredMass: 100,
				item: SubstanceComponent.new('water'),
			})
			.addIngredient({
				name: 'water',
				desiredMass: 100,
				item: SubstanceComponent.new('water'),
			});

		assert.deepEqual(mx.makeSubstanceMap().get('water')!.mass, 200, 'water substance map');
		assert.deepEqual(mx.waterMass, 200, 'water ingredient mass');
		assert.equal(mx.ingredients.size, 2, 'two ingredients');
	});

	test('can add sub-mixtures', () => {
		const mx0 = new Mixture().addIngredient({
			name: 'water',
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		});
		const mx1 = new Mixture().addIngredient({
			name: 'water',
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		});

		const mx = new Mixture()
			.addIngredient({ name: 'water 0', desiredMass: 10, item: mx0 })
			.addIngredient({ name: 'water 1', desiredMass: 10, item: mx1 });
		assert.equal(mx.substances.length, 2, 'two substances');

		assert.equal(mx.makeSubstanceMap().get('water')!.mass, 20, 'water substance map');
		assert.equal(mx.waterMass, 20, 'water ingredient mass');
		assert.equal(mx.ingredients.size, 2, 'two ingredients');
	});

	test('can remove ingredient', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'water',
				desiredMass: 100,
				item: SubstanceComponent.new('water'),
			})
			.addIngredient({
				name: 'water',
				desiredMass: 100,
				item: SubstanceComponent.new('water'),
			});

		let mass = 200;
		let ingredientCount = 2;
		assert.equal(mx.ingredients.size, ingredientCount, 'two ingredients');
		for (const id of mx.ingredientIds) {
			mx.removeIngredient(id);
			ingredientCount--;
			mass -= 100;
			assert.equal(mx.ingredients.size, ingredientCount, `${ingredientCount} ingredients`);
			assert.equal(mx.mass, mass, 'water ingredient mass');
		}
	});

	test('can set mass', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'water',
				desiredMass: 100,
				item: SubstanceComponent.new('water'),
			})
			.addIngredient({
				name: 'water',
				desiredMass: 100,
				item: SubstanceComponent.new('water'),
			});

		mx.setMass(1000);
		assert.equal(mx.mass, 1000, 'mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 500, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 500, 'ingredient 2 mass');

		mx.setMass(0);
		assert.equal(mx.mass, 0, 'mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 0, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 0, 'ingredient 2 mass');

		mx.setMass(100);
		assert.equal(mx.mass, 100, 'mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 50, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 50, 'ingredient 2 mass');
	});

	test('can set volume', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'water',
				desiredMass: 100,
				item: SubstanceComponent.new('water'),
			})
			.addIngredient({
				name: 'water',
				desiredMass: 100,
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
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'water',
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		});

	mx.setIngredientMass(mx.ingredientIds[0], 500);
	assert.equal(mx.getIngredientMass(mx.ingredientIds[0]), 500, 'ingredient 1 mass');
	assert.equal(mx.getIngredientMass(mx.ingredientIds[1]), 100, 'ingredient 2 mass');
	assert.equal(mx.mass, 600, 'mass');
});

test('can solve for abv', () => {
	const mx = new Mixture()
		.addIngredient({
			name: 'water',
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'ethanol',
			desiredMass: 100,
			item: SubstanceComponent.new('ethanol'),
		});
	mx.setVolume(1000);
	mx.setAbv(40);
	assert.approximately(mx.abv, 40, 0.001, 'abv');
	assert.approximately(mx.volume, 1000, 0.01, 'volume');
});

test('can update from other mixture', () => {
	const mx0 = new Mixture()
		.addIngredient({
			name: 'water',
			desiredMass: 10,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'sucrose',
			desiredMass: 10,
			item: SubstanceComponent.new('sucrose'),
		});

	const mx1 = new Mixture()
		.addIngredient({
			name: 'water',
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'ethanol',
			desiredMass: 100,
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
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'ethanol',
			desiredMass: 100,
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
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'ethanol',
			desiredMass: 100,
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
			desiredMass: 100,
			item: SubstanceComponent.new('water'),
		})
		.addIngredient({
			name: 'ethanol',
			desiredMass: 100,
			item: SubstanceComponent.new('ethanol'),
		});
	const clone = mx.clone();
	assert.deepEqual(clone, mx, 'clone');
});
