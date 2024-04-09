import { describe, it, expect } from 'vitest';
import { createMixtureStore } from './mixture-store';
import { deserialize } from './deserialize.js';
import { Sugar } from './sugar.js';

describe('Mixture Store', () => {
	it('should initialize with default values', () => {
		const store = createMixtureStore();

		const state = store.get();
		expect(state.title).toBe('mixture');
		expect(state.mixture).toBeDefined();
		expect(state.totalsLock).toEqual([]);
		expect(state.readonlyComponents).toEqual([]);
		expect(state.errors).toEqual([]);
		expect(state.totals).toBeDefined();
	});

	it('should get the current state', () => {
		const store = createMixtureStore();

		const state = store.get();
		expect(store.getMixture()).toBe(state.mixture);
	});

	it('should find a component by id', () => {
		const store = createMixtureStore();

		const components = [
			{
				name: 'spirit' as const,
				id: 'spirit-0',
				data: {
					type: 'spirit' as const,
					volume: 100,
					abv: 40,
					locked: []
				}
			},
			{
				name: 'water' as const,
				id: 'water-1',
				data: {
					type: 'water' as const,
					volume: 100,
					locked: []
				}
			},
			{
				name: 'sugar' as const,
				id: 'sugar-2',
				data: {
					type: 'sugar' as const,
					mass: 50,
					locked: []
				}
			}
		];

		store.deserialize({
			liqueur: 'My Mixture',
			components
		});

		const foundComponent = store.findComponent('spirit-0');
		expect({
			name: foundComponent.name,
			id: foundComponent.id,
			data: foundComponent.component.data
		}).toStrictEqual(components[0]);

		const state = store.get();
		expect(deserialize(state.mixture.serialize()).components).toEqual(components);
	});

	it('should set the volume', () => {
		const store = createMixtureStore();

		const components = [
			{
				name: 'spirit' as const,
				id: 'spirit-0',
				data: {
					type: 'spirit' as const,
					volume: 100,
					abv: 40,
					locked: []
				}
			},
			{
				name: 'water' as const,
				id: 'water-1',
				data: {
					type: 'water' as const,
					volume: 100,
					locked: []
				}
			},
			{
				name: 'sugar' as const,
				id: 'sugar-2',
				data: {
					type: 'sugar' as const,
					mass: 50 * Sugar.density,
					locked: []
				}
			}
		];

		store.deserialize({
			liqueur: 'My Mixture',
			components
		});

		expect(store.get().totals).toStrictEqual({
			abv: 16,
			brix: 29.3,
			mass: 271.1,
			volume: 250
		});

		store.setVolume('water-1', 200);

		expect(store.get().totals).toStrictEqual({
			abv: 11.4,
			brix: 21.4,
			mass: 371.1,
			volume: 350
		});

		store.setVolume('spirit-0', 200);

		expect(store.get().totals).toStrictEqual({
			abv: 17.8,
			brix: 17.2,
			mass: 462.7,
			volume: 450
		});
	});

	// Add more tests for other functions in the store...
});
