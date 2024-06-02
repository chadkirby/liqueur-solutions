import { writable, get, derived } from 'svelte/store';
import { isSugarData, type SerializedComponent } from './component.js';
import { dataToMixture } from './data-to-mixture.js';
import { Syrup } from './syrup.js';
import { Sugar } from './sugar.js';
import { Spirit } from './spirit.js';
import { Water } from './water.js';
import type { Analysis } from './utils.js';
import { Mixture } from './mixture.js';
import { goto } from '$app/navigation';

export type ComponentValueKey = 'volume' | 'abv' | 'mass' | 'brix' | 'kcal' | 'proof';

export function createMixtureStore() {
	const store = writable({
		title: 'mixture',
		mixture: new Mixture([]),
		totalsLock: [] as Array<ComponentValueKey>,
		errors: [] as Array<{ componentId: string; key: ComponentValueKey }>,
		totals: getTotals(new Mixture([]))
	});
	const { subscribe, set } = store;

	function getTotals(mixture: Mixture) {
		if (!mixture.isValid) {
			throw new Error('Invalid mixture');
		}
		return mixture.analyze(1);
	}

	function update(updater: Parameters<typeof store.update>[0]) {
		store.update((data) => {
			const newData = updater(data);
			if (newData.mixture.isValid) {
				newData.totals = getTotals(newData.mixture);
				updateUrl(newData.mixture);
			}
			return newData;
		});
	}

	return {
		get() {
			return get(store);
		},
		subscribe,
		getMixture() {
			return get(store).mixture;
		},
		errorStore(componentId: string, key: ComponentValueKey) {
			return derived(store, ($store) => {
				return $store.errors.some((e) => e.componentId === componentId && e.key === key);
			});
		},
		resetError(componentId: string, key: ComponentValueKey) {
			update((data) => {
				data.errors = data.errors.filter((e) => e.componentId !== componentId || e.key !== key);
				return data;
			});
		},
		addComponents(components: Mixture['components']) {
			update((data) => {
				for (const component of components) {
					data.mixture.addComponent({ ...component });
				}
				return data;
			});
		},
		removeComponent(componentId: string) {
			update((data) => {
				data.mixture.removeComponent(componentId);
				return data;
			});
		},
		setVolume(componentId: string, newVolume: number): void {
			if (componentId === 'totals') {
				this.solveTotal('volume', newVolume);
				return;
			}
			update((data) => {
				const working = data.mixture.clone();
				const component = working.findById(componentId);
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-volume`
				);

				if (Spirit.is(component)) {
					const spirit = component.clone();
					spirit.set('volume', newVolume);
					if (!roundEq(spirit.volume, newVolume)) {
						data.errors.push({ componentId, key: 'volume' });
						return data;
					}
					component.data = spirit.data;
				} else if (Water.is(component)) {
					const water = component.clone();
					water.set('volume', newVolume);
					if (!roundEq(water.volume, newVolume)) {
						data.errors.push({ componentId, key: 'volume' });
						return data;
					}
					component.data = water.data;
				} else if (Syrup.is(component)) {
					const syrup = component.clone();
					syrup.set('volume', newVolume);
					if (!roundEq(syrup.volume, newVolume)) {
						data.errors.push({ componentId, key: 'volume' });
						return data;
					}
					component.data = syrup.data;
				} else if (Sugar.is(component)) {
					throw new Error(`Unable to set volume of component ${componentId}`);
				}

				if (data.totalsLock.some((key) => key === 'brix' || key === 'abv')) {
					working.solveTotal('volume', newVolume, data.totalsLock);
				}

				data.mixture = working;

				return data;
			});
		},
		setAbv(componentId: string, newAbv: number): void {
			if (componentId === 'totals') {
				this.solveTotal('abv', newAbv);
				return;
			}
			update((data) => {
				const component = data.mixture.findById(componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-abv`
				);
				if (Spirit.is(component)) {
					const spirit = component.clone();
					spirit.set('abv', newAbv);
					if (!roundEq(spirit.abv, newAbv)) {
						data.errors.push({ componentId, key: 'abv' });
						return data;
					}
					component.data = spirit.data;
				} else {
					throw new Error(`Unable to set abv of component ${componentId}`);
				}

				return data;
			});
		},
		setMass(componentId: string, newMass: number): void {
			if (componentId === 'totals') {
				throw new Error('Cannot set mass of totals');
			}
			update((data) => {
				const component = data.mixture.findById(componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-mass`
				);
				if (isSugarData(component.data)) {
					const sugar = Sugar.fromData(component.data);
					sugar.set('mass', newMass);
					if (!roundEq(sugar.mass, newMass)) {
						data.errors.push({ componentId, key: 'mass' });
						return data;
					}
					component.data = sugar.data;
				} else {
					throw new Error(`Unable to set mass of component ${componentId}`);
				}

				return data;
			});
		},
		setBrix(componentId: string, newBrix: number): void {
			if (componentId === 'totals') {
				this.solveTotal('brix', newBrix);
				return;
			}
			update((data) => {
				const component = data.mixture.findById(componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-brix`
				);

				if (Syrup.is(component)) {
					const syrup = component.clone();
					syrup.set('brix', newBrix);
					if (!roundEq(syrup.brix, newBrix)) {
						data.errors.push({ componentId, key: 'brix' });
						return data;
					}
					component.data = syrup.data;
				} else {
					throw new Error(`Unable to set brix of component ${componentId}`);
				}

				return data;
			});
		},
		updateComponentName(componentId: string, newName: string): void {
			update((data) => {
				const component = data.mixture.components.find((c) => c.id === componentId);
				if (!component) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				component.name = newName;
				return data;
			});
		},
		toggleLock(componentId: string, key: ComponentValueKey) {
			update((data) => {
				if (componentId === 'totals') {
					const index = data.totalsLock.indexOf(key);
					if (index === -1) {
						data.totalsLock.push(key);
					} else {
						data.totalsLock.splice(index, 1);
					}
				}
				return data;
			});
		},
		solveTotal(key: keyof Analysis, requestedValue: number): void {
			update((data) => {
				// remove any totals errors
				data.errors = data.errors.filter((e) => `${e.componentId}-${e.key}` !== `totals-${key}`);
				const mixture = this.getMixture().clone();
				try {
					mixture.solveTotal(key, requestedValue, data.totalsLock);
				} catch (error) {
					data.errors.push({ componentId: 'totals', key });
					return data;
				}
				if (!roundEq(mixture[key], requestedValue)) {
					data.errors.push({ componentId: 'totals', key });
					return data;
				}

				data.mixture = mixture;
				return data;
			});
		},
		/** reset the store */
		deserialize(data: { liqueur: string; components: SerializedComponent[] }) {
			console.log('deserialize', data);
			const mixture = dataToMixture(data);
			set({
				title: data.liqueur,
				mixture,
				totalsLock: [],
				totals: getTotals(mixture),
				errors: []
			});
		}
	};
}

function roundEq(a: number, b: number) {
	return Math.round(a) === Math.round(b);
}

export const mixtureStore = createMixtureStore();

export function updateUrl(mixture = mixtureStore.getMixture()) {
	if (mixture.isValid) {
		goto(`/${encodeURIComponent(mixtureStore.get().title)}?${mixture.serialize(1)}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}
}
