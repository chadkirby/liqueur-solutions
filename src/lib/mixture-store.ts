import { writable, get, derived } from 'svelte/store';
import { isSweetenerData, SweetenerTypes } from './component.js';
import { Sweetener } from './sweetener.js';
import { Water } from './water.js';
import { type Analysis } from './utils.js';
import { isSyrup, Mixture, type MixtureComponent } from './mixture.js';
import { solver } from './solver.js';
import { filesDb } from './local-storage.svelte';
import { asStorageId, type StorageId } from './storage-id.js';

export type ComponentValueKey = keyof Analysis;

function findById(mixture: Mixture, id: string): MixtureComponent | null {
	for (const component of mixture.eachComponentAndSubmixture()) {
		if (component.id === id) {
			return component;
		}
	}
	return null;
}

export function createMixtureStore() {
	const store = writable({
		storeId: '/0' as StorageId,
		name: `Mixture-0`,
		mixture: new Mixture([]),
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
			}
			save({
				storeId: newData.storeId,
				name: newData.name,
				mixture: newData.mixture
			});
			return newData;
		});
	}

	function save({
		storeId,
		name,
		mixture
	}: {
		storeId: StorageId;
		name: string;
		mixture: Mixture;
	}) {
		filesDb.write({
			id: storeId,
			accessTime: Date.now(),
			name,
			desc: mixture.describe(),
			href: urlEncode(name, mixture)
		});
	}

	return {
		get() {
			return get(store);
		},
		set(...args: Parameters<typeof store.set>) {
			store.set(...args);
			store.update((data) => {
				data.totals = getTotals(data.mixture);
				this.save();
				return data;
			});
		},
		subscribe,
		getStoreId() {
			return get(store).storeId;
		},
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
		getName() {
			return get(store).name;
		},
		setName(name: string) {
			update((data) => {
				data.name = name;
				return data;
			});
		},
		addComponentTo(parentId: string | null, component: Omit<MixtureComponent, 'id'>) {
			update((data) => {
				if (parentId === null) {
					data.mixture.addComponent({ ...component });
				} else {
					const parent = findById(data.mixture, parentId);
					if (!parent) {
						throw new Error(`Unable to find component ${parentId}`);
					}
					if (!(parent.component instanceof Mixture)) {
						throw new Error(`Component ${parentId} is not a mixture`);
					}
					parent.component.addComponent({ ...component });
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
				const mxc = findById(working, componentId);
				const component = mxc?.component;
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-volume`
				);

				if (component instanceof Water) {
					const water = component.clone();
					water.setVolume(newVolume);
					if (!roundEq(water.volume, newVolume)) {
						data.errors.push({ componentId, key: 'volume' });
						return data;
					}
					component.data = water.data;
				} else if (component instanceof Mixture) {
					const mx = component.clone();
					mx.setVolume(newVolume);
					if (!roundEq(mx.volume, newVolume)) {
						data.errors.push({ componentId, key: 'volume' });
						return data;
					}
					component.data = mx.data;
				} else if (component instanceof Sweetener) {
					const sweetener = component.clone();
					sweetener.setVolume(newVolume);
					if (!roundEq(sweetener.volume, newVolume)) {
						data.errors.push({ componentId, key: 'volume' });
						return data;
					}
					component.data = sweetener.data;
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
				const mxc = findById(data.mixture, componentId);
				if (!mxc) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				const { component } = mxc;
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-abv`
				);
				if (component instanceof Mixture && component.findComponent((c) => c.abv > 0)) {
					const spirit = component.clone();
					spirit.setAbv(newAbv);
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
				const mc = findById(data.mixture, componentId);
				if (!mc) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				const { component } = mc;
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-mass`
				);
				if (isSweetenerData(component.data)) {
					const sweetener = new Sweetener(component.data.subType, newMass);
					component.data = sweetener.data;
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
				const mxc = findById(data.mixture, componentId);
				if (!mxc) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				const { component } = mxc;
				// clear any errors
				data.errors = data.errors.filter(
					(e) => `${e.componentId}-${e.key}` !== `${componentId}-brix`
				);

				if (component instanceof Mixture) {
					const syrup = component.clone();
					syrup.setBrix(newBrix);
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
				const mcx = findById(data.mixture, componentId);
				if (!mcx) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				mcx.name = newName;
				return data;
			});
		},
		updateSweetenerSubType: (id: string, subType: SweetenerTypes) => {
			update((data) => {
				const mcx = findById(data.mixture, id);
				if (!mcx) {
					throw new Error(`Unable to find component ${id}`);
				}
				const component = mcx.component;
				if (component instanceof Sweetener) {
					// This will trigger the mixture's recalculations since
					// subType affects equivalentSugarMass and other derived
					// values
					component.subType = subType;
				} else if (component && isSyrup(component)) {
					const sweetener = component.findByType((x) => x instanceof Sweetener);
					if (sweetener) {
						sweetener.subType = subType;
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
					solveTotal(mixture, key, requestedValue);
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
		load({ storeId, name, mixture }: { storeId: StorageId; name: string; mixture: Mixture }) {
			set({
				storeId: asStorageId(storeId),
				name,
				mixture,
				totals: getTotals(mixture),
				errors: []
			});
			filesDb.write({
				id: storeId,
				accessTime: Date.now(),
				name,
				desc: mixture.describe(),
				href: urlEncode(name, mixture)
			});
		},
		save() {
			const { storeId, name, mixture } = get(store);
			save({ storeId, name, mixture });
		}
	};
}

export function urlEncode(title: string, mixture: Mixture) {
	return `/${encodeURIComponent(title)}?gz=${encodeURIComponent(mixture.serialize())}`;
}

function roundEq(a: number, b: number) {
	return Math.round(a) === Math.round(b);
}

export const mixtureStore = createMixtureStore();

// function updateUrl(mixture: Mixture, storeId: string | null) {
// 	if (mixture.isValid) {
// 		if (storeId) {
// 			const url = urlEncode(mixtureStore.getName(), mixtureStore.getMixture());
// 			// window.localStorage.setItem(storeId, url);
// 			// goto(`/file${storeId}`, {
// 			// 	replaceState: true,
// 			// 	noScroll: true,
// 			// 	keepFocus: true
// 			// });
// 		} else {
// 			// goto(url, {
// 			// 	replaceState: true,
// 			// 	noScroll: true,
// 			// 	keepFocus: true
// 			// });
// 		}
// 	}
// }

function solveTotal(mixture: Mixture, key: keyof Analysis, targetValue: number): void {
	if (!mixture.canEdit(key)) {
		throw new Error(`${key} is not editable`);
	}

	let working: Mixture | undefined;
	switch (key) {
		case 'volume':
			working = mixture.clone();
			working.setVolume(targetValue);
			break;
		case 'abv':
			working = solver(mixture, { abv: targetValue, brix: mixture.brix, volume: null });
			working.setVolume(mixture.volume);
			break;
		case 'brix':
			working = solver(mixture, { abv: mixture.abv, brix: targetValue, volume: null });
			working.setVolume(mixture.volume);
			break;
	}
	if (!working) {
		throw new Error(`Unable to solve for ${key} = ${targetValue}`);
	}
	// test that the solution is valid
	if (!working.isValid) {
		throw new Error(`Invalid solution for ${key} = ${targetValue}`);
	}
	if (working[key].toFixed() !== targetValue.toFixed()) {
		throw new Error(`Unable to solve for ${key} = ${targetValue}`);
	}

	for (const [i, obj] of mixture.componentObjects.entries()) {
		obj.data = working.componentObjects[i].rawData;
	}
}
