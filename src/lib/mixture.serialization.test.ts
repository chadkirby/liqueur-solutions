import { describe, test, expect, assert } from 'vitest';
import { Mixture } from './mixture.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import { type DeserializedFileDataV1 } from './data-format.js';
import { currentDataVersion } from './data-format.js';

// We're not testing the actual storage system, just the
// serialization/deserialization process that would be used by the
// storage system

describe('Storage serialization for notes', () => {
	test('notes are preserved in storage format', () => {
		// Create a mixture with notes
		const mixture = new Mixture();
		mixture.addIngredient({
			name: 'Ingredient with Note',
			mass: 100,
			notes: 'Important brewing details here',
			item: SubstanceComponent.new('water'),
		});

		// Serialize to storage format
		const ingredientDb = mixture.serialize();

		// Create file data structure (what would be stored)
		const fileData: DeserializedFileDataV1 = {
			version: currentDataVersion,
			id: 'test-id',
			name: 'Test Mixture',
			accessTime: Date.now(),
			desc: 'Test description',
			rootMixtureId: mixture.id,
			ingredientDb,
		};

		// Deserialize from storage format
		const deserializedMixture = Mixture.deserialize(fileData.rootMixtureId, fileData.ingredientDb);

		// Check if notes were preserved
		const ingredient = [...deserializedMixture.ingredients.values()][0];
		expect(ingredient.notes).toBe('Important brewing details here');
	});

	test('empty string notes are preserved in storage format', () => {
		const mixture = new Mixture();
		mixture.addIngredient({
			name: 'Ingredient with Empty Note',
			mass: 100,
			notes: '',
			item: SubstanceComponent.new('water'),
		});

		const ingredientDb = mixture.serialize();
		const fileData: DeserializedFileDataV1 = {
			version: currentDataVersion,
			id: 'test-id',
			name: 'Test Mixture',
			accessTime: Date.now(),
			desc: 'Test description',
			rootMixtureId: mixture.id,
			ingredientDb,
		};

		const deserializedMixture = Mixture.deserialize(fileData.rootMixtureId, fileData.ingredientDb);

		const ingredient = [...deserializedMixture.ingredients.values()][0];
		expect(ingredient.notes).toBe('');
	});

	test('undefined notes field is handled correctly in storage format', () => {
		const mixture = new Mixture();
		mixture.addIngredient({
			name: 'Ingredient without Notes',
			mass: 100,
			item: SubstanceComponent.new('water'),
		});

		const ingredientDb = mixture.serialize();
		const fileData: DeserializedFileDataV1 = {
			version: currentDataVersion,
			id: 'test-id',
			name: 'Test Mixture',
			accessTime: Date.now(),
			desc: 'Test description',
			rootMixtureId: mixture.id,
			ingredientDb,
		};

		const deserializedMixture = Mixture.deserialize(fileData.rootMixtureId, fileData.ingredientDb);

		const ingredient = [...deserializedMixture.ingredients.values()][0];
		expect(ingredient.notes).toBeUndefined();
	});

	test('complex nested mixtures preserve notes in storage format', () => {
		// Create a nested mixture structure
		const innerMixture = new Mixture();
		innerMixture.addIngredient({
			name: 'Inner Ingredient',
			mass: 50,
			notes: 'Inner notes',
			item: SubstanceComponent.new('water'),
		});

		const outerMixture = new Mixture();
		outerMixture.addIngredient({
			name: 'Simple Ingredient',
			mass: 100,
			notes: 'Simple notes',
			item: SubstanceComponent.new('ethanol'),
		});
		outerMixture.addIngredient({
			name: 'Nested Mixture',
			mass: 150,
			notes: 'Nested notes',
			item: innerMixture,
		});

		// Serialize to storage format
		const ingredientDb = outerMixture.serialize();

		// Create file data structure
		const fileData: DeserializedFileDataV1 = {
			version: currentDataVersion,
			id: 'test-id',
			name: 'Test Nested Mixture',
			accessTime: Date.now(),
			desc: 'Test description',
			rootMixtureId: outerMixture.id,
			ingredientDb,
		};

		// Deserialize from storage format
		const deserializedMixture = Mixture.deserialize(fileData.rootMixtureId, fileData.ingredientDb);

		// Get the ingredients
		const ingredients = [...deserializedMixture.ingredients.values()];
		const simpleIngredient = ingredients.find((i) => i.name === 'Simple Ingredient');
		const nestedIngredient = ingredients.find((i) => i.name === 'Nested Mixture');

		// Check outer mixture notes
		expect(simpleIngredient?.notes).toBe('Simple notes');
		expect(nestedIngredient?.notes).toBe('Nested notes');

		// Check inner mixture notes
		if (nestedIngredient?.item instanceof Mixture) {
			const innerIngredient = [...nestedIngredient.item.ingredients.values()][0];
			expect(innerIngredient.notes).toBe('Inner notes');
		} else {
			assert.fail('Nested ingredient should be a Mixture');
		}
	});
});
