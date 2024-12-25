import { type Updater } from 'svelte/store';
import { isSweetenerData, SweetenerTypes } from './components/index.js';
import { Sweetener } from './components/sweetener.js';
import { digitsForDisplay, getTotals, type Analysis } from './utils.js';
import { componentId, isSyrup, Mixture, type MixtureComponent } from './mixture.js';
import { solver } from './solver.js';
import { type StorageId } from './storage-id.js';
import { UndoRedo } from './undo-redo.svelte.js';
import { decrement, increment, type MinMax } from './increment-decrement.js';
export type ComponentValueKey = keyof Analysis;

export type EditableComponentType = 'abv' | 'brix' | 'volume' | 'mass';

type MixtureStoreData = {
	storeId: StorageId;
	name: string;
	mixture: Mixture;
	totals: Analysis;
};

export const loadingStoreId = '/loading' as StorageId;

function newData(): MixtureStoreData {
	const mx = new Mixture([]);
	return {
		storeId: loadingStoreId,
		name: '',
		mixture: mx,
		totals: getTotals(mx)
	};
}

// exported for testing
export class MixtureStore {
	private _data = $state(newData());
	constructor(
		data = newData(),
		private readonly opts: { onUpdate?: (data: MixtureStoreData) => void } = {}
	) {
		this._data = data;
	}

	snapshot(): MixtureStoreData {
		return {
			...this._data,
			mixture: this.mixture.clone()
		};
	}

	findById(id: string, mixture = this.mixture): MixtureComponent | null {
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

	findMixture(id: string) {
		const component = this.findById(id);
		if (component && component.component instanceof Mixture) {
			return component.component;
		}
		return null;
	}

	get storeId() {
		return this._data.storeId;
	}

	get name() {
		return this._data.name;
	}

	get mixture() {
		return this._data.mixture;
	}

	get totals() {
		return this._data.totals;
	}

	private undoRedo = new UndoRedo<MixtureStoreData>();
	readonly undoCount = $derived(this.undoRedo.undoLength);
	readonly redoCount = $derived(this.undoRedo.redoLength);

	private update(
		actionDesc: string,
		updater: Updater<MixtureStoreData>,
		undoer: Updater<MixtureStoreData>
	) {
		this.undoRedo.push(actionDesc, undoer, updater);
		const snapshot = this.snapshot();
		const newData = updater(snapshot);
		if (newData.mixture.isValid) {
			newData.totals = getTotals(newData.mixture);
		}
		this._save(newData);
		if (this.opts.onUpdate) {
			this.opts.onUpdate(newData);
		}
		return newData;
	}

	private async _save(newData: MixtureStoreData) {
		this._data = { ...newData };
	}
	setName(newName: string, undoKey = 'setName') {
		const originalName = this.name;
		this.update(
			undoKey,
			(data) => {
				data.name = newName;
				return data;
			},
			(data) => {
				data.name = originalName;
				return data;
			}
		);
	}
	addComponentTo(
		parentId: string | null,
		component: Omit<MixtureComponent, 'id'>,
		undoKey = `addComponentTo-${parentId}`
	) {
		const newId = componentId();
		this.update(
			undoKey,
			(data) => {
				if (parentId === null) {
					data.mixture.addComponent({ id: newId, ...component });
				} else {
					const parent = this.findById(parentId, data.mixture);
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
	}
	removeComponent(componentId: string, undoKey = `removeComponent-${componentId}`) {
		const mxc = this.findById(componentId);
		if (!mxc) {
			throw new Error(`Unable to find component ${componentId}`);
		}

		this.update(
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
	}
	increment(key: EditableComponentType, componentId: string, minMax?: MinMax) {
		const mxc = this.findById(componentId);
		if (!mxc) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		const component = mxc.component;
		if (!component.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		const originalValue = component[key];
		const newValue = increment(originalValue, minMax);
		if (newValue === originalValue) return;

		const actionDesc = `increment-${key}-${componentId}`;
		if (key === 'volume') {
			return this.setVolume(componentId, newValue, actionDesc);
		} else if (key === 'abv') {
			return this.setAbv(componentId, newValue, actionDesc);
		} else if (key === 'brix') {
			return this.setBrix(componentId, newValue, actionDesc);
		} else if (key === 'mass') {
			return this.setMass(componentId, newValue, actionDesc);
		}
		key satisfies never;
	}
	decrement(key: EditableComponentType, componentId: string, minMax?: MinMax) {
		const mxc = this.findById(componentId);
		if (!mxc) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		const component = mxc.component;
		if (!component.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		const originalValue = component[key];
		const newValue = decrement(originalValue, minMax);
		if (newValue === originalValue) return;

		const actionDesc = `decrement-${key}-${componentId}`;
		if (key === 'volume') {
			return this.setVolume(componentId, newValue, actionDesc);
		} else if (key === 'abv') {
			return this.setAbv(componentId, newValue, actionDesc);
		} else if (key === 'brix') {
			return this.setBrix(componentId, newValue, actionDesc);
		} else if (key === 'mass') {
			return this.setMass(componentId, newValue, actionDesc);
		}
		key satisfies never;
	}
	getVolume(componentId: string) {
		const mxc = this.findById(componentId);
		if (!mxc) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		return mxc.component.volume;
	}
	setVolume(componentId: string, newVolume: number, undoKey = `setVolume-${componentId}`): void {
		const originalVolume = this.getVolume(componentId);
		if (componentId === 'totals') {
			this.solveTotal('volume', newVolume);
			return;
		}
		const makeUpdater = (targetVolume: number) => {
			return (data: MixtureStoreData) => {
				const working = data.mixture.clone();
				const mxc = this.findById(componentId, working);
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
		this.update(undoKey, makeUpdater(newVolume), makeUpdater(originalVolume));
	}
	getAbv(componentId: string) {
		const mxc = this.findById(componentId);
		if (!mxc) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		return mxc.component.abv;
	}
	setAbv(componentId: string, newAbv: number, undoKey = `setAbv-${componentId}`): void {
		if (componentId === 'totals') {
			this.solveTotal('abv', newAbv);
			return;
		}
		const originalAbv = this.getAbv(componentId);
		const makeUpdater = (targetAbv: number) => {
			return (data: MixtureStoreData) => {
				const mxc = this.findById(componentId, data.mixture);
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
		this.update(undoKey, makeUpdater(newAbv), makeUpdater(originalAbv));
	}
	getMass(componentId: string) {
		const mxc = this.findById(componentId);
		if (!mxc) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		return mxc.component.mass;
	}
	setMass(componentId: string, newMass: number, undoKey = `setMass-${componentId}`): void {
		if (componentId === 'totals') {
			throw new Error('Cannot set mass of totals');
		}
		const originalMass = this.getMass(componentId);
		const makeUpdater = (targetMass: number) => {
			return (data: MixtureStoreData) => {
				const mc = this.findById(componentId, data.mixture);
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
		this.update(undoKey, makeUpdater(newMass), makeUpdater(originalMass));
	}
	getBrix(componentId: string) {
		const mxc = this.findById(componentId);
		if (!mxc) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		return mxc.component.brix;
	}
	setBrix(componentId: string, newBrix: number, undoKey = `setBrix-${componentId}`): void {
		if (componentId === 'totals') {
			this.solveTotal('brix', newBrix);
			return;
		}
		const originalBrix = this.getBrix(componentId);
		const makeUpdater = (targetBrix: number) => {
			return (data: MixtureStoreData) => {
				const mxc = this.findById(componentId, data.mixture);
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
		this.update(undoKey, makeUpdater(newBrix), makeUpdater(originalBrix));
	}
	updateComponentName(
		componentId: string,
		newName: string,
		undoKey = `updateComponentName-${componentId}`
	): void {
		const mcx = this.findById(componentId);
		if (!mcx) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		const originalName = mcx.name;
		const makeUpdater = (targetName: string) => {
			return (data: MixtureStoreData) => {
				const mcx = this.findById(componentId, data.mixture);
				if (!mcx) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				mcx.name = targetName;
				return data;
			};
		};
		this.update(undoKey, makeUpdater(newName), makeUpdater(originalName));
	}
	getSweetenerSubType(id: string) {
		const mcx = this.findById(id, this.mixture);
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
	}
	updateSweetenerSubType(
		id: string,
		newSubType: SweetenerTypes,
		undoKey = `updateSweetenerSubType-${id}`
	): void {
		const originalSubType = this.getSweetenerSubType(id);
		const makeUpdater = (targetSubType: SweetenerTypes) => {
			return (data: MixtureStoreData) => {
				const mcx = this.findById(id, this.mixture);
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
		this.update(undoKey, makeUpdater(newSubType), makeUpdater(originalSubType));
	}

	solveTotal(key: keyof Analysis, newValue: number, undoKey = `solveTotal-${key}`): void {
		const originalValue = this.totals[key];
		const makeUpdater = (targetValue: number) => {
			return (data: MixtureStoreData) => {
				const mixture = this.mixture.clone();
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
		this.update(undoKey, makeUpdater(newValue), makeUpdater(originalValue));
	}
	undo() {
		const undoItem = this.undoRedo.getUndo();
		if (!undoItem.length) return;
		const data = this.snapshot();
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
		this._save(newData);
	}
	redo() {
		const redoItem = this.undoRedo.getRedo();
		if (!redoItem.length) return;
		const data = this.snapshot();
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
		this._save(newData);
	}
}

function roundEq(a: number, b: number, maxVal = Infinity) {
	const smaller = Math.min(a, b);
	const digits = digitsForDisplay(smaller, maxVal);
	return Math.abs(a - b) < Math.pow(10, -digits);
}

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
