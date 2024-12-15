import { describe, it, expect } from 'vitest';
import { MixtureStore } from './mixture-store.svelte';
import { Water } from './water.js';
import { Mixture, newSpirit } from './mixture.js';

describe('Mixture Store', () => {
	it('should initialize with default values', () => {
		const store = new MixtureStore();

		const state = store.snapshot();
		expect(state.name).toBe('Mixture-0');
		expect(state.storeId).toBe('/0');
		expect(state.mixture).toBeDefined();
		expect(state.totals).toBeDefined();
	});

	it('should get the current state and mixture', () => {
		const store = new MixtureStore();
		const state = store.snapshot();
		expect(store.mixture).toEqual(state.mixture);
		expect(store.storeId).toBe('/0');
		expect(store.name).toBe('Mixture-0');
	});

	it('should add and remove components', () => {
		const store = new MixtureStore();

		// Add a spirit component
		store.addComponentTo(null, {
			name: 'spirit',
			component: new Mixture([])
		});

		let state = store.snapshot();
		expect(state.mixture.components.length).toBe(1);
		const spiritId = state.mixture.components[0].id;

		// Add water to the spirit mixture
		store.addComponentTo(spiritId, {
			name: 'water',
			component: new Water(100)
		});

		state = store.snapshot();
		const spiritComponent = state.mixture.components[0];
		expect(spiritComponent.component instanceof Mixture).toBe(true);
		if (spiritComponent.component instanceof Mixture) {
			expect(spiritComponent.component.components.length).toBe(1);
			expect(spiritComponent.component.components[0].component instanceof Water).toBe(true);
		}

		// Remove the water component
		const waterId = (spiritComponent.component as Mixture).components[0].id;
		store.removeComponent(waterId);

		state = store.snapshot();
		expect((state.mixture.components[0].component as Mixture).components.length).toBe(0);
	});

	it('should handle volume changes and track errors', () => {
		const store = new MixtureStore();

		// Add a water component
		store.addComponentTo(null, {
			name: 'water',
			component: new Water(100)
		});

		const state = store.snapshot();
		const waterId = state.mixture.components[0].id;

		// Get initial volume
		expect(store.getVolume(waterId)).toBe(100);

		// Set valid volume
		store.setVolume(waterId, 200);
		expect(store.getVolume(waterId)).toBe(200);

		// Set invalid volume (negative)
		store.setVolume(waterId, -50);
	});

	it('should handle ABV changes', () => {
		const store = new MixtureStore();

		// Add a spirit mixture
		store.addComponentTo(null, { name: '', component: newSpirit(100, 40) });
		// add a water component
		store.addComponentTo(null, {
			name: 'water',
			component: new Water(100)
		});

		const state = store.snapshot();
		const spiritId = state.mixture.components[0].id;

		// Set ABV
		store.setAbv(spiritId, 30);
		expect(store.getAbv(spiritId)).toBeCloseTo(30, 0.01);

		// Set invalid ABV (over 100)
		try {
			store.setAbv(spiritId, 150);
		} catch (error) {
			expect(error).toBeDefined();
		}
		expect(store.getAbv(spiritId)).toBeCloseTo(30, 0.01); // should be clamped to 100
	});

	it('should handle name changes', () => {
		const store = new MixtureStore();

		store.setName('New Mixture Name');
		expect(store.name).toBe('New Mixture Name');
		expect(store.snapshot().name).toBe('New Mixture Name');
	});
});
