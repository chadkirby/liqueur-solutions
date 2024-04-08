import type { PageData } from '../routes/[liqueur]/$types.js';
type Components = PageData['components'];
import { writable, get, derived } from 'svelte/store';
import { isSpiritData, isSugarData, isSyrupData, isWaterData } from './component.js';
import { dataToMixture } from './data-to-mixture.js';
function createMixtureStore() {
	const store = writable({
		components: [] as Components,
		totalsLock: [] as Array<'brix' | 'volume' | 'mass' | 'abv'>,
		totals: recalculateTotals([])
	});
	const { subscribe, set, update } = store;

	function recalculateTotals(components: Components) {
		const mixture = dataToMixture({ components });
		if (!mixture.isValid) {
			throw new Error('Invalid mixture');
		}
		return mixture.analyze(1);
	}

	return {
		get() {
			return get(store);
		},
		subscribe,
		getMixture() {
			return dataToMixture(get(store));
		},
		findComponent(componentId: string) {
			const component = get(store).components.find((c) => c.id === componentId);
			if (!component) {
				throw new Error(`Unable to find component ${componentId}`);
			}
			return component;
		},
		componentValueStore(componentId: string, key: 'brix' | 'volume' | 'mass' | 'abv') {
			return derived(store, ($store) => {
				if (componentId === 'totals') return $store.totals[key];
				const component = $store.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				if (isSpiritData(component.data) && (key === 'abv' || key === 'volume')) {
					return component.data[key];
				} else if (isSugarData(component.data) && key === 'mass') {
					return component.data[key];
				} else if (isSyrupData(component.data) && (key === 'brix' || key === 'volume')) {
					return component.data[key];
				} else if (isWaterData(component.data) && key === 'volume') {
					return component.data[key];
				} else {
					console.log(component.data);
					throw new Error(`Unable to get ${key} of component ${componentId}`);
				}
			});
		},
		lockedStore(componentId: string, key: 'brix' | 'volume' | 'mass' | 'abv') {
			return derived(store, ($store) => {
				if (componentId === 'totals') return $store.totalsLock.includes(key);
				const component = $store.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				return component.data.locked.includes(key as never);
			});
		},
		addComponents(components: Components) {
			update((data) => {
				for (const component of components) {
					const origId = component.id ?? component.name;
					let inc = 0;
					let id = origId;
					while (data.components.some((c) => c.id === id)) {
						id = `${origId}-${++inc}`;
					}
					data.components.push({ ...component, id });
				}
				data.totals = recalculateTotals(data.components);
				return data;
			});
		},
		removeComponent(componentId: string) {
			update((data) => {
				data.components = data.components.filter((c) => c.id !== componentId);
				data.totals = recalculateTotals(data.components);
				return data;
			});
		},
		updateComponentVolume(componentId: string, newVolume: number): void {
			update((data) => {
				const component = data.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				if (!isSugarData(component.data)) {
					component.data.volume = newVolume;
				} else {
					throw new Error(`Unable to set volume of component ${componentId}`);
				}

				data.totals = recalculateTotals(data.components);

				return data;
			});
		},
		updateComponentAbv(componentId: string, newAbv: number): void {
			update((data) => {
				const component = data.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				if (isSpiritData(component.data)) {
					component.data.abv = newAbv;
				} else {
					throw new Error(`Unable to set abv of component ${componentId}`);
				}

				data.totals = recalculateTotals(data.components);

				return data;
			});
		},
		updateComponentMass(componentId: string, newMass: number): void {
			update((data) => {
				const component = data.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				if (isSugarData(component.data)) {
					component.data.mass = newMass;
				} else {
					throw new Error(`Unable to set mass of component ${componentId}`);
				}

				data.totals = recalculateTotals(data.components);

				return data;
			});
		},
		updateComponentBrix(componentId: string, newBrix: number): void {
			update((data) => {
				const component = data.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				if (isSyrupData(component.data)) {
					component.data.brix = newBrix;
				} else {
					throw new Error(`Unable to set brix of component ${componentId}`);
				}

				data.totals = recalculateTotals(data.components);

				return data;
			});
		},
		updateComponentName(componentId: string, newName: string): void {
			update((data) => {
				const component = data.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				component.name = newName;
				return data;
			});
		},
		toggleLock(componentId: string, key: 'brix' | 'volume' | 'mass' | 'abv') {
			update((data) => {
				if (componentId === 'totals') {
					const index = data.totalsLock.indexOf(key);
					if (index === -1) {
						data.totalsLock.push(key);
					} else {
						data.totalsLock.splice(index, 1);
					}
					return data;
				}
				const component = data.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				// using indexOf on a union type requires a bit of a hack
				const locked = component.data.locked as Array<'brix' | 'volume' | 'mass' | 'abv'>;
				const index = locked.indexOf(key);
				if (index === -1) {
					locked.push(key);
				} else {
					locked.splice(index, 1);
				}

				return data;
			});
		},
		solveForVolume(totalVolume: number): void {
			update((data) => {
				const mixture = dataToMixture(data);
				const delta = (totalVolume - mixture.lockedVolume) / (mixture.unlockedVolume || 1);
				for (const item of mixture.componentObjects) {
					item.set('volume', (item.volume || 1) * delta);
				}

				data.components = mixture.components.map(({ name, id, component }) => ({
					name,
					id,
					data: component.data
				}));
				data.totals = recalculateTotals(data.components);
				return data;
			});
		},
		solveForAbv(totalAbv: number): void {
			update((data) => {
				const mixture = dataToMixture(data);
				mixture.setAbv(totalAbv);
				data.components = mixture.components.map(({ name, id, component }) => ({
					name,
					id,
					data: component.data
				}));
				data.totals = recalculateTotals(data.components);
				return data;
			});
		},
		solveForBrix(totalBrix: number): void {
			update((data) => {
				const mixture = dataToMixture(data);
				mixture.setBrix(totalBrix);
				data.components = mixture.components.map(({ name, id, component }) => ({
					name,
					id,
					data: component.data
				}));
				data.totals = recalculateTotals(data.components);
				return data;
			});
		},
		/** reset the store */
		setData(components: Components) {
			set({ components, totalsLock: get(store).totalsLock, totals: recalculateTotals(components) });
		}
	};
}

export const mixtureStore = createMixtureStore();
