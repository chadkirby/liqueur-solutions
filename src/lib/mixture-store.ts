import { writable, get } from 'svelte/store';
import { writable, get, type Updater } from 'svelte/store';
import { isSweetenerData, SweetenerTypes } from './component.js';
import { Sweetener } from './sweetener.js';
import { digitsForDisplay, type Analysis } from './utils.js';
import { isSyrup, Mixture, type MixtureComponent } from './mixture.js';
import { componentId, isSyrup, Mixture, type MixtureComponent } from './mixture.js';
import { solver } from './solver.js';
import { filesDb } from './local-storage.svelte';
import { asStorageId, type StorageId } from './storage-id.js';

export type ComponentValueKey = keyof Analysis;

function findById(mixture: Mixture, id: string): MixtureComponent | null {
	if (id === 'totals') {
		return { id, name: 'totals', component: mixture };
	}
	for (const component of mixture.eachComponentAndSubmixture()) {
		if (component.id === id) {
			return component;
		}
	}
	return null;
}

type MixtureStoreData = {
	storeId: StorageId;
	name: string;
	mixture: Mixture;
	totals: Analysis;
};

export function createMixtureStore() {
	const store = writable<MixtureStoreData>({
		storeId: '/0' as StorageId,
		name: `Mixture-0`,
		mixture: new Mixture([]),
		totals: getTotals(new Mixture([]))
	});
	const { subscribe, set } = store;

	const undoRedo = new UndoRedo<MixtureStoreData>();

	function getTotals(mixture: Mixture) {
		if (!mixture.isValid) {
			throw new Error('Invalid mixture');
		}
		return mixture.analyze(1);
	}

	function update(
		actionDesc: string,
		updater: Updater<MixtureStoreData>,
		undoer: Updater<MixtureStoreData>
	) {
		undoRedo.push(actionDesc, undoer, updater);
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
		getName() {
			return get(store).name;
		},
		setName(newName: string, undoKey = 'setName') {
			const oroginalName = get(store).name;
			update(
				undoKey,
				(data) => {
					data.name = newName;
					return data;
				},
				(data) => {
					data.name = oroginalName;
					return data;
				}
			);
		},
		addComponentTo(
			parentId: string | null,
			component: Omit<MixtureComponent, 'id'>,
			undoKey = `addComponentTo-${parentId}`
		) {
			const newId = componentId();
			update(
				undoKey,
				(data) => {
					if (parentId === null) {
						data.mixture.addComponent({ id: newId, ...component });
					} else {
						const parent = findById(data.mixture, parentId);
						if (!parent) {
							throw new Error(`Unable to find component ${parentId}`);
						}
						if (!(parent.component instanceof Mixture)) {
							throw new Error(`Component ${parentId} is not a mixture`);
						}
						parent.component.addComponent({ id: newId, ...component });
					}
					return data;
				},
				(data) => {
					data.mixture.removeComponent(newId);
					return data;
				}
			);
		},
		removeComponent(componentId: string, undoKey = `removeComponent-${componentId}`) {
			const mxc = findById(get(store).mixture, componentId);
			if (!mxc) {
				throw new Error(`Unable to find component ${componentId}`);
			}

			update(
				undoKey,
				(data) => {
					data.mixture.removeComponent(componentId);
					return data;
				},
				(data) => {
					data.mixture.addComponent(mxc);
					return data;
				}
			);
		},
		},
		getVolume(componentId: string) {
			const mxc = findById(get(store).mixture, componentId);
			if (!mxc) {
				throw new Error(`Unable to find component ${componentId}`);
			}
			return mxc.component.volume;
		},
		setVolume(componentId: string, newVolume: number, undoKey = `setVolume-${componentId}`): void {
			const originalVolume = this.getVolume(componentId);
			if (componentId === 'totals') {
				this.solveTotal('volume', newVolume);
				return;
			}
			const makeUpdater = (targetVolume: number) => {
				return (data: MixtureStoreData) => {
					const working = data.mixture.clone();
					const mxc = findById(working, componentId);
					const component = mxc?.component;
					if (!component) {
						throw new Error(`Unable to find component ${componentId}`);
					}

					const clone = component.clone();
					clone.setVolume(targetVolume);
					if (!roundEq(clone.volume, targetVolume)) {
						throw new Error(`Unable to set requested volume of component ${componentId}`);
					}
					component.data = clone.data;

					data.mixture = working;

					return data;
				};
			};
			update(undoKey, makeUpdater(newVolume), makeUpdater(originalVolume));
		},
		getAbv(componentId: string) {
			const mxc = findById(get(store).mixture, componentId);
			if (!mxc) {
				throw new Error(`Unable to find component ${componentId}`);
			}
			return mxc.component.abv;
		},
		setAbv(componentId: string, newAbv: number, undoKey = `setAbv-${componentId}`): void {
			if (componentId === 'totals') {
				this.solveTotal('abv', newAbv);
				return;
			}
			const originalAbv = this.getAbv(componentId);
			const makeUpdater = (targetAbv: number) => {
				return (data: MixtureStoreData) => {
					const mxc = findById(data.mixture, componentId);
					if (!mxc) {
						throw new Error(`Unable to find component ${componentId}`);
					}
					const { component } = mxc;
					if (component instanceof Mixture && component.findComponent((c) => c.abv > 0)) {
						const spirit = component.clone();
						spirit.setAbv(targetAbv);
						if (!roundEq(spirit.abv, targetAbv)) {
							throw new Error(`Unable to set requested abv of component ${componentId}`);
						}
						component.data = spirit.data;
					} else {
						throw new Error(`Unable to set abv of component ${componentId}`);
					}

					return data;
				};
			};
			update(undoKey, makeUpdater(newAbv), makeUpdater(originalAbv));
		},
		getMass(componentId: string) {
			const mxc = findById(get(store).mixture, componentId);
			if (!mxc) {
				throw new Error(`Unable to find component ${componentId}`);
			}
			return mxc.component.mass;
		},
		setMass(componentId: string, newMass: number, undoKey = `setMass-${componentId}`): void {
			if (componentId === 'totals') {
				throw new Error('Cannot set mass of totals');
			}
			const originalMass = this.getMass(componentId);
			const makeUpdater = (targetMass: number) => {
				return (data: MixtureStoreData) => {
					const mc = findById(data.mixture, componentId);
					if (!mc) {
						throw new Error(`Unable to find component ${componentId}`);
					}
					const { component } = mc;

					if (isSweetenerData(component.data)) {
						const sweetener = new Sweetener(component.data.subType, targetMass);
						component.data = sweetener.data;
					} else {
						throw new Error(`Unable to set mass of component ${componentId}`);
					}

					return data;
				};
			};
			update(undoKey, makeUpdater(newMass), makeUpdater(originalMass));
		},
		getBrix(componentId: string) {
			const mxc = findById(get(store).mixture, componentId);
			if (!mxc) {
				throw new Error(`Unable to find component ${componentId}`);
			}
			return mxc.component.brix;
		},
		setBrix(componentId: string, newBrix: number, undoKey = `setBrix-${componentId}`): void {
			if (componentId === 'totals') {
				this.solveTotal('brix', newBrix);
				return;
			}
			const originalBrix = this.getBrix(componentId);
			const makeUpdater = (targetBrix: number) => {
				return (data: MixtureStoreData) => {
					const mxc = findById(data.mixture, componentId);
					if (!mxc) {
						throw new Error(`Unable to find component ${componentId}`);
					}
					const { component } = mxc;

					if (component instanceof Mixture) {
						const syrup = component.clone();
						syrup.setBrix(targetBrix);
						if (!roundEq(syrup.brix, targetBrix)) {
							throw new Error(`Unable to set requested brix of component ${componentId}`);
						}
						component.data = syrup.data;
					} else {
						throw new Error(`Unable to set brix of component ${componentId}`);
					}

					return data;
				};
			};
			update(undoKey, makeUpdater(newBrix), makeUpdater(originalBrix));
		},
		updateComponentName(
			componentId: string,
			newName: string,
			undoKey = `updateComponentName-${componentId}`
		): void {
			const mcx = findById(this.getMixture(), componentId);
			if (!mcx) {
				throw new Error(`Unable to find component ${componentId}`);
			}
			const originalName = mcx.name;
			const makeUpdater = (targetName: string) => {
				return (data: MixtureStoreData) => {
					const mcx = findById(data.mixture, componentId);
					if (!mcx) {
						throw new Error(`Unable to find component ${componentId}`);
					}
					mcx.name = targetName;
					return data;
				};
			};
			update(undoKey, makeUpdater(newName), makeUpdater(originalName));
		},
		getSweetenerSubType(id: string) {
			const mcx = findById(this.getMixture(), id);
			if (!mcx) {
				throw new Error(`Unable to find component ${id}`);
			}
			if (mcx.component instanceof Sweetener) {
				return mcx.component.subType;
			}
			if (mcx.component && isSyrup(mcx.component)) {
				const sweetener = mcx.component.findByType((x) => x instanceof Sweetener);
				if (sweetener) {
					return sweetener.subType;
				}
			}
			throw new Error(`Unable to get subType of component ${id}`);
		},
		updateSweetenerSubType(
			id: string,
			newSubType: SweetenerTypes,
			undoKey = `updateSweetenerSubType-${id}`
		): void {
			const originalSubType = this.getSweetenerSubType(id);
			const makeUpdater = (targetSubType: SweetenerTypes) => {
				return (data: MixtureStoreData) => {
					const mcx = findById(this.getMixture(), id);
					if (!mcx) {
						throw new Error(`Unable to find component ${id}`);
					}
					const component = mcx.component;
					if (component instanceof Sweetener) {
						// This will trigger the mixture's recalculations since
						// subType affects equivalentSugarMass and other derived
						// values
						component.subType = newSubType;
					} else if (component && isSyrup(component)) {
						const sweetener = component.findByType((x) => x instanceof Sweetener);
						if (sweetener) {
							sweetener.subType = newSubType;
						}
					}
					return data;
				};
			};
			update(undoKey, makeUpdater(newSubType), makeUpdater(originalSubType));
		},

		solveTotal(key: keyof Analysis, newValue: number): void {
			const originalValue = get(store).totals[key];
			const makeUpdater = (targetValue: number) => {
				return (data: MixtureStoreData) => {
					const mixture = this.getMixture().clone();
					try {
						solveTotal(mixture, key, targetValue);
					} catch (error) {
						throw new Error(`Unable to solve for ${key} = ${targetValue}`);
					}
					if (!roundEq(mixture[key], targetValue)) {
						throw new Error(`Unable to solve for ${key} = ${targetValue}`);
					}

					data.mixture = mixture;
					return data;
				};
			};
			update('solveTotal', makeUpdater(newValue), makeUpdater(originalValue));
		},
		/** reset the store */
		load({ storeId, name, mixture }: { storeId: StorageId; name: string; mixture: Mixture }) {
			set({
				storeId: asStorageId(storeId),
				name,
				mixture,
				totals: getTotals(mixture)
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
		},
		undo() {
			const undoItem = undoRedo.getUndo();
			if (!undoItem.length) return;
			store.update((data) => {
				let newData = undoItem.pop()!(data);
				if (newData.mixture.isValid) {
					newData.totals = getTotals(newData.mixture);
				}
				while (undoItem.length) {
					newData = undoItem.pop()!(data);
					if (newData.mixture.isValid) {
						newData.totals = getTotals(newData.mixture);
					}
				}
				save({
					storeId: newData.storeId,
					name: newData.name,
					mixture: newData.mixture
				});
				return newData;
			});
		},
		redo() {
			const redoItem = undoRedo.getRedo();
			if (!redoItem.length) return;
			store.update((data) => {
				let newData = redoItem.shift()!(data);
				if (newData.mixture.isValid) {
					newData.totals = getTotals(newData.mixture);
				}
				while (redoItem.length) {
					newData = redoItem.shift()!(data);
					if (newData.mixture.isValid) {
						newData.totals = getTotals(newData.mixture);
					}
				}
				save({
					storeId: newData.storeId,
					name: newData.name,
					mixture: newData.mixture
				});
				return newData;
			});
		}
	};
}

export function urlEncode(title: string, mixture: Mixture) {
	return `/${encodeURIComponent(title)}?gz=${encodeURIComponent(mixture.serialize())}`;
}

function roundEq(a: number, b: number, maxVal = Infinity) {
	const smaller = Math.min(a, b);
	const digits = digitsForDisplay(smaller, maxVal);
	return a.toFixed(digits) === b.toFixed(digits);
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
		obj.data = working.componentObjects[i].data;
	}
}
