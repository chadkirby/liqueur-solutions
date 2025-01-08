import { describe, it, expect, beforeEach } from 'vitest';
import { MixtureStore, loadingStoreId, type MixtureStoreData } from './mixture-store.svelte';
import { Mixture } from './mixture.js';
import { newSpirit } from './mixture-factories.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import type { IngredientItem, MixtureAnalysis } from './mixture-types.js';

function standardSpirit(volume = 100, abv = 40, name = 'spirit') {
	const item = newSpirit(volume, abv);
	return {
		name,
		item,
		mass: item.mass,
	};
}

function ingredientList(data: MixtureStoreData | IngredientItem): IngredientItem[] {
	return 'mixture' in data
		? Array.from(data.mixture.ingredients.values())
		: 'ingredients' in data.item
			? Array.from(data.item.ingredients.values())
			: [];
}

describe('Mixture Store', () => {
	it('should initialize with default values', () => {
		const store = new MixtureStore();

		const state = store.snapshot();
		expect(state.name).toBe('');
		expect(state.storeId).toBe(loadingStoreId);
		expect(state.mixture).toBeDefined();
		expect(state.totals).toBeDefined();
	});

	it('should get the current state and mixture', () => {
		const store = new MixtureStore();
		const state = store.snapshot();
		expect(store.mixture).toEqual(state.mixture);
		expect(store.storeId).toBe(loadingStoreId);
		expect(store.name).toBe('');
	});

	it('should add and remove components', () => {
		const store = new MixtureStore();
		// Add a spirit component
		const spiritId = store.addIngredientTo(null, standardSpirit());

		let state = store.snapshot();
		expect(state.mixture.ingredients.size).toBe(1);

		// Add water to the spirit mixture
		const waterId = store.addIngredientTo(spiritId, {
			name: 'water',
			item: SubstanceComponent.new('water'),
			mass: 100,
		});

		state = store.snapshot();
		const spirit = state.mixture.ingredients.get(spiritId)!;
		expect(spirit.item instanceof Mixture).toBe(true);
		if (!(spirit.item instanceof Mixture)) {
			throw new Error('Expected spirit component to be a mixture');
		}

		expect(spirit.item.ingredients.size).toBe(3);
		expect((spirit.item.ingredients.get(waterId)!.item as SubstanceComponent).substanceId).toBe(
			'water',
		);
		// Remove the water component
		store.removeIngredient(waterId);

		state = store.snapshot();
		expect((state.mixture.ingredients.get(spiritId)!.item as Mixture).ingredients.size).toBe(2);
	});

	it('should handle volume changes', () => {
		const store = new MixtureStore();

		// Add a water component
		store.addIngredientTo(null, {
			name: 'water',
			item: SubstanceComponent.new('water'),
			mass: 100,
		});

		const state = store.snapshot();
		const waterId = ingredientList(state)[0].id;

		// Get initial volume
		expect(store.getVolume(waterId)).toBe(100);

		// Set valid volume
		store.setVolume(waterId, 200);
		expect(store.getVolume(waterId)).toBe(200);

		try {
			// Set invalid volume (negative)
			store.setVolume(waterId, -50);
		} catch (error) {
			expect(error).toBeDefined();
		}
		expect(store.getVolume(waterId)).toBe(200);
	});

	it('should handle ABV changes', () => {
		const store = new MixtureStore();

		// Add a spirit mixture
		store.addIngredientTo(null, standardSpirit());
		// add a water component
		store.addIngredientTo(null, {
			name: 'water',
			item: SubstanceComponent.new('water'),
			mass: 100,
		});

		// Set ABV
		store.setAbv('totals', 30);
		expect(store.mixture.getAbv()).toBeCloseTo(30, 0.01);

		// Set invalid ABV (over 100)
		try {
			store.setAbv('totals', 150);
		} catch (error) {
			expect(error).toBeDefined();
		}
		expect(store.getAbv()).toBeCloseTo(30, 0.01); // should be clamped to 100
	});

	it('should handle ingredient ABV changes', () => {
		const store = new MixtureStore();

		// Add a spirit mixture
		const spiritId = store.addIngredientTo(null, standardSpirit());

		// Set ABV
		store.setAbv(spiritId, 30);
		expect(store.mixture.getAbv()).toBeCloseTo(30, 0.01);

		// Set invalid ABV (over 100)
		try {
			store.setAbv(spiritId, 150);
		} catch (error) {
			expect(error).toBeDefined();
		}
		expect(store.getAbv()).toBeCloseTo(30, 0.01); // should be clamped to 100
	});

	it('should handle name changes', () => {
		const store = new MixtureStore();

		store.setName('New Mixture Name');
		expect(store.name).toBe('New Mixture Name');
		expect(store.snapshot().name).toBe('New Mixture Name');
	});

	it('should support undo/redo operations', () => {
		const store = new MixtureStore();

		// Initially no undo/redo available
		expect(store.undoCount).toBe(0);
		expect(store.redoCount).toBe(0);

		// Add a water component
		store.addIngredientTo(null, {
			name: 'water',
			item: SubstanceComponent.new('water'),
			mass: 100,
		});

		// @ts-expect-error undoRedo is private
		store.undoRedo._forceCommit();

		// Should have one undo available
		expect(store.undoCount).toBe(1);
		expect(store.redoCount).toBe(0);

		const state = store.snapshot();
		const waterId = ingredientList(state)[0].id;

		// Change volume
		store.setVolume(waterId, 200);
		// @ts-expect-error undoRedo is private
		store.undoRedo._forceCommit();
		expect(store.getVolume(waterId)).toBe(200);
		expect(store.undoCount).toBe(2);
		expect(store.redoCount).toBe(0);

		// Undo volume change
		store.undo();
		expect(store.getVolume(waterId)).toBe(100);
		expect(store.undoCount).toBe(1);
		expect(store.redoCount).toBe(1);

		// Redo volume change
		store.redo();
		expect(store.getVolume(waterId)).toBe(200);
		expect(store.undoCount).toBe(2);
		expect(store.redoCount).toBe(0);

		// Undo back to start
		store.undo();
		store.undo();
		expect(store.mixture.ingredients.size).toBe(0);
		expect(store.undoCount).toBe(0);
		expect(store.redoCount).toBe(2);
	});

	it('should clear redo stack when new action is performed', () => {
		const store = new MixtureStore();

		// Add water
		store.addIngredientTo(null, {
			name: 'water',
			item: SubstanceComponent.new('water'),
			mass: 100,
		});

		const state = store.snapshot();
		const waterId = ingredientList(state)[0].id;

		// Change volume to 200
		store.setVolume(waterId, 200);

		// Undo volume change
		store.undo();
		expect(store.getVolume(waterId)).toBe(100);
		expect(store.redoCount).toBe(1);

		// Make a new change
		store.setVolume(waterId, 300);
		// @ts-expect-error undoRedo is private
		store.undoRedo._forceCommit();

		// Redo stack should be cleared
		expect(store.redoCount).toBe(0);
		expect(store.getVolume(waterId)).toBe(300);
	});
});

describe('Mixture store solver', () => {
	let store: MixtureStore;
	let initialAnalysis: MixtureAnalysis;

	beforeEach(() => {
		store = new MixtureStore();
		store.addIngredientTo(null, standardSpirit(50, 100));
		store.addIngredientTo(null, {
			name: 'water',
			item: SubstanceComponent.new('water'),
			mass: 50,
		});
		store.addIngredientTo(null, {
			name: 'sugar',
			item: SubstanceComponent.new('sucrose'),
			mass: 50,
		});
		initialAnalysis = store.mixture.analyze(2);
	});

	it('should solve for volume', () => {
		// Act
		store.solveTotal('volume', 200);

		// Assert
		expect(store.getVolume('totals')).toBeCloseTo(200, 0);
		expect(store.getAbv('totals')).toBeCloseTo(initialAnalysis.abv, 1);
		expect(store.getBrix('totals')).toBeCloseTo(initialAnalysis.brix, 1);
	});

	it('should solve for abv', () => {
		// Act
		store.solveTotal('abv', 50);

		// Assert
		expect(store.getVolume('totals')).toBeCloseTo(initialAnalysis.volume, 1);
		expect(store.getAbv('totals')).toBeCloseTo(50, 1);
		expect(store.getBrix('totals')).toBeCloseTo(initialAnalysis.brix, 1);
	});

	it('should solve for brix', () => {
		// Act
		store.solveTotal('brix', 25);

		// Assert
		expect(store.getVolume('totals')).toBeCloseTo(initialAnalysis.volume, 1);
		expect(store.getAbv('totals')).toBeCloseTo(initialAnalysis.abv, 1);
		expect(store.getBrix('totals')).toBeCloseTo(25, 1);
	});

	it('should throw an error for unable to solve', () => {
		// Act & Assert
		expect(() => store.solveTotal('abv', 200)).toThrowError('Unable to solve for abv = 200');
	});
});
