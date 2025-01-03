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
			mass: 100,
			component: SubstanceComponent.new('water')
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
				mass: 100,
				component: SubstanceComponent.new('water')
			})
			.addIngredient({
				name: 'water',
				mass: 100,
				component: SubstanceComponent.new('water')
			});

		assert.deepEqual(mx.makeSubstanceMap().get('water')!.mass, 200, 'water substance map');
		assert.deepEqual(mx.waterMass, 200, 'water ingredient mass');
		assert.equal(mx.ingredients.size, 2, 'two ingredients');
	});

	test('can add sub-mixtures', () => {
		const mx0 = new Mixture().addIngredient({
			name: 'water',
			mass: 100,
			component: SubstanceComponent.new('water'),
		});
		const mx1 = new Mixture().addIngredient({
			name: 'water',
			mass: 100,
			component: SubstanceComponent.new('water'),
		});

		const mx = new Mixture()
			.addIngredient({ name: 'water 0', mass: 10, component: mx0 })
			.addIngredient({ name: 'water 1', mass: 10, component: mx1 });

		assert.equal(mx.makeSubstanceMap().get('water')!.mass, 20, 'water substance map');
		assert.equal(mx.waterMass, 20, 'water ingredient mass');
		assert.equal(mx.ingredients.size, 2, 'two ingredients');
	});


	test('can remove ingredient', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'water',
				mass: 100,
				component: SubstanceComponent.new('water')
			})
			.addIngredient({
				name: 'water',
				mass: 100,
				component: SubstanceComponent.new('water')
			});

		let mass = 200;
		let ingredientCount = 2;
		assert.equal(mx.ingredients.size, ingredientCount, 'two ingredients');
		for (const id of mx.eachIngredientId()) {
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
				mass: 100,
				component: SubstanceComponent.new('water')
			})
			.addIngredient({
				name: 'water',
				mass: 100,
				component: SubstanceComponent.new('water')
			});

		const ingredientIds = [...mx.eachIngredientId()];

		mx.setMass(1000);
		assert.equal(mx.mass, 1000, 'mass');
		assert.equal(mx.getIngredientMass(ingredientIds[0]), 500, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(ingredientIds[1]), 500, 'ingredient 2 mass');

		mx.setMass(0);
		assert.equal(mx.mass, 0, 'mass');
		assert.equal(mx.getIngredientMass(ingredientIds[0]), 0, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(ingredientIds[1]), 0, 'ingredient 2 mass');

		mx.setMass(100);
		assert.equal(mx.mass, 100, 'mass');
		assert.equal(mx.getIngredientMass(ingredientIds[0]), 50, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(ingredientIds[1]), 50, 'ingredient 2 mass');
	});

	test('can set volume', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'water',
				mass: 100,
				component: SubstanceComponent.new('water')
			})
			.addIngredient({
				name: 'water',
				mass: 100,
				component: SubstanceComponent.new('water')
			});

		const ingredientIds = [...mx.eachIngredientId()];

		mx.setVolume(1000);
		assert.equal(mx.volume, 1000, 'volume');
		assert.equal(mx.getIngredientMass(ingredientIds[0]), 500, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(ingredientIds[1]), 500, 'ingredient 2 mass');

		mx.setVolume(0);
		assert.equal(mx.volume, 0, 'volume');
		assert.equal(mx.getIngredientMass(ingredientIds[0]), 0, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(ingredientIds[1]), 0, 'ingredient 2 mass');

		mx.setVolume(100);
		assert.equal(mx.volume, 100, 'volume');
		assert.equal(mx.getIngredientMass(ingredientIds[0]), 50, 'ingredient 1 mass');
		assert.equal(mx.getIngredientMass(ingredientIds[1]), 50, 'ingredient 2 mass');
	});
});

test('can set ingredient mass', () => {
	const mx = new Mixture()
		.addIngredient({
			name: 'water',
			mass: 100,
			component: SubstanceComponent.new('water')
		})
		.addIngredient({
			name: 'water',
			mass: 100,
			component: SubstanceComponent.new('water')
		});

	const ingredientIds = [...mx.eachIngredientId()];

	mx.setIngredientMass(ingredientIds[0], 500);
	assert.equal(mx.getIngredientMass(ingredientIds[0]), 500, 'ingredient 1 mass');
	assert.equal(mx.getIngredientMass(ingredientIds[1]), 100, 'ingredient 2 mass');
	assert.equal(mx.mass, 600, 'mass');
});

test('can solve for abv', () => {
	const mx = new Mixture()
		.addIngredient({
			name: 'water',
			mass: 100,
			component: SubstanceComponent.new('water')
		})
		.addIngredient({
			name: 'ethanol',
			mass: 100,
			component: SubstanceComponent.new('ethanol')
		});
	mx.setVolume(1000);
	mx.setAbv(40);
	assert.approximately(mx.abv, 40, 0.001, 'abv');
	assert.approximately(mx.volume, 1000, 0.01, 'volume');
});
describe('can model pH', () => {
	test('should work with water', () => {
		const mx = new Mixture().addIngredient({
			name: 'water',
			mass: 100,
			component: SubstanceComponent.new('water'),
		});
		assert.equal(mx.pH, 7, 'pH');
	});

	test('should work with citric acid', () => {
		const mx = new Mixture()
			.addIngredient({
				name: 'citric acid',
				mass: 6,
				component: SubstanceComponent.new('citric-acid'),
			})
			.addIngredient({
				name: 'water',
				mass: 94,
				component: SubstanceComponent.new('water'),
			});
		assert.approximately(mx.pH, 1.82, 0.1, 'pH');
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
		assert.approximately(mx.pH, 5.5, 0.1, 'pH with buffer pair');
	});

	test('should handle unequal buffer pair - citric acid and sodium citrate', () => {
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

	test('should handle multiple buffer pairs', () => {
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
