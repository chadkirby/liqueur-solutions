import { type Updater } from 'svelte/store';
import { SubstanceComponent, SweetenerTypes } from './ingredients/substance-component.js';
import { digitsForDisplay, getTotals, type Analysis } from './utils.js';
import {
	componentId,
	isSweetenerMixture,
	isSweetenerSubstance,
	isSyrup,
	Mixture,
	type IngredientItem,
	type IngredientToAdd,
} from './mixture.js';
import { solver } from './solver.js';
import { type StorageId } from './storage-id.js';
import { UndoRedo } from './undo-redo.svelte.js';
import { decrement, increment, type MinMax } from './increment-decrement.js';
import { isSweetenerId } from './ingredients/substances.js';
export type ComponentValueKey = keyof Analysis;

export type EditableComponentType = 'abv' | 'brix' | 'volume' | 'mass';

export type MixtureStoreData = {
	storeId: StorageId;
	name: string;
	mixture: Mixture;
	totals: Analysis;
};

export const loadingStoreId = '/loading' as StorageId;

function newData(): MixtureStoreData {
	const mx = new Mixture();
	return {
		storeId: loadingStoreId,
		name: '',
		mixture: mx,
		totals: getTotals(mx),
	};
}

// exported for testing
export class MixtureStore {
	private _data = $state(newData());
	constructor(
		data = newData(),
		private readonly opts: { onUpdate?: (data: MixtureStoreData) => void } = {},
	) {
		this._data = data;
	}

	snapshot(): MixtureStoreData {
		return {
			...this._data,
			mixture: this.mixture.clone(),
		};
	}

	private findIngredient(id: string, mixture = this.mixture): IngredientItem | null {
		if (id === 'totals') {
			return { id, name: 'totals', proportion: 1, item: mixture };
		}
		for (const { ingredient } of mixture.eachIngredient()) {
			if (ingredient.id === id) {
				return ingredient;
			}
		}
		for (const { ingredient } of mixture.eachIngredient()) {
			if (ingredient.item instanceof Mixture) {
				const found = this.findIngredient(id, ingredient.item);
				if (found) return found;
			}
		}
		return null;
	}

	findMixture(id: string) {
		const item = this.findIngredient(id);
		if (item && item.item instanceof Mixture) {
			return item.item;
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

	private update({
		undoKey,
		updater,
		undoer,
	}: {
		undoKey: string;
		updater: Updater<MixtureStoreData>;
		undoer: Updater<MixtureStoreData>;
	}) {
		this.undoRedo.push(undoKey, undoer, updater);
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
		this.update({
			undoKey: undoKey,
			updater(data) {
				data.name = newName;
				return data;
			},
			undoer(data) {
				data.name = originalName;
				return data;
			},
		});
	}
	addIngredientTo(
		parentId: string | null,
		ingredientItem: IngredientToAdd,
		undoKey = `addIngredientTo-${parentId}`,
	) {
		const newId = componentId();
		this.update({
			undoKey,
			updater: (data) => {
				if (parentId === null) {
					data.mixture.addIngredient({ id: newId, ...ingredientItem });
				} else {
					const parent = this.findIngredient(parentId, data.mixture);
					if (!parent) {
						throw new Error(`Unable to find component ${parentId}`);
					}
					if (!(parent.item instanceof Mixture)) {
						throw new Error(`Ingredient ${parentId} is not a mixture`);
					}
					parent.item.addIngredient({ id: newId, ...ingredientItem });
				}
				return data;
			},
			undoer: (data) => {
				data.mixture.removeIngredient(newId);
				return data;
			},
		});
		return newId;
	}
	removeIngredient(id: string, undoKey = `removeIngredient-${id}`) {
		const mxc = this.findIngredient(id);
		if (!mxc) {
			throw new Error(`Unable to find component ${id}`);
		}

		const ingredientToAdd: IngredientToAdd = {
			name: mxc.name,
			mass: this.mixture.getIngredientMass(id),
			item: mxc.item,
		};

		this.update({
			undoKey,
			updater: (data) => {
				data.mixture.removeIngredient(id);
				return data;
			},
			undoer: (data) => {
				data.mixture.addIngredient(ingredientToAdd);
				return data;
			},
		});
	}
	increment(key: EditableComponentType, componentId: string, minMax?: MinMax) {
		const ingredientItem = this.findIngredient(componentId);
		if (!ingredientItem) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		if (!this.mixture.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		const originalValue = this.mixture.get(ingredientItem, key);
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
		const ingredientItem = this.findIngredient(componentId);
		if (!ingredientItem) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		if (!this.mixture.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		const originalValue = this.mixture.get(ingredientItem, key);
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
	getVolume(id = 'totals') {
		if (id === 'totals') {
			return this.totals.volume;
		}
		const mxc = this.findIngredient(id);
		if (!mxc) {
			throw new Error(`Unable to find component ${id}`);
		}
		return this.mixture.getIngredientVolume(id);
	}
	setVolume(id: string, newVolume: number, undoKey = `setVolume-${id}`): void {
		const originalVolume = this.getVolume(id);
		if (id === 'totals') {
			this.solveTotal('volume', newVolume);
			return;
		}
		const makeUpdater = (targetVolume: number) => {
			return (data: MixtureStoreData) => {
				const working = data.mixture.clone();
				const mxc = this.findIngredient(id, working);
				const item = mxc?.item;
				if (!item) {
					throw new Error(`Unable to find component ${id}`);
				}

				working.setIngredientVolume(id, targetVolume);
				if (!roundEq(working.getIngredientVolume(id), targetVolume)) {
					throw new Error(`Unable to set requested volume of component ${id}`);
				}

				data.mixture = working;

				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newVolume), undoer: makeUpdater(originalVolume) });
	}
	getAbv(ingredientId = 'totals') {
		return ingredientId === 'totals'
			? this.totals.abv
			: this.mixture.getIngredientAbv(ingredientId);
	}
	setAbv(id: string, newAbv: number, undoKey = `setAbv-${id}`): void {
		if (id === 'totals') {
			this.solveTotal('abv', newAbv);
			return;
		}
		const originalAbv = this.getAbv(id);
		const makeUpdater = (targetAbv: number) => {
			return (data: MixtureStoreData) => {
				const mxc = this.findIngredient(id, data.mixture);
				if (!mxc) {
					throw new Error(`Unable to find component ${id}`);
				}
				if (!(mxc.item instanceof Mixture)) {
					throw new Error(`Unable to set abv of substance ${id}`);
				}
				if (!mxc.item.eachSubstance().some((s) => s.item.substanceId === 'ethanol')) {
					throw new Error(`Mixture has no ethanol ${id}`);
				}
				const mixture = this.mixture.clone();
				try {
					solveTotal(mixture, 'abv', newAbv);
				} catch (error) {
					throw new Error(`Unable to solve for abv = ${newAbv}`);
				}

				data.mixture = mixture;

				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newAbv), undoer: makeUpdater(originalAbv) });
	}
	getMass(id = 'totals') {
		return id === 'totals' ? this.totals.mass : this.mixture.getIngredientMass(id);
	}
	setMass(componentId: string, newMass: number, undoKey = `setMass-${componentId}`): void {
		if (componentId === 'totals') {
			throw new Error('Cannot set mass of totals');
		}
		const originalMass = this.getMass(componentId);
		const makeUpdater = (targetMass: number) => {
			return (data: MixtureStoreData) => {
				data.mixture.setIngredientMass(componentId, targetMass);
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newMass), undoer: makeUpdater(originalMass) });
	}
	getBrix(ingredientId = 'totals') {
		if (ingredientId === 'totals') {
			return this.totals.brix;
		}
		const brix = this.mixture.getIngredientBrix(ingredientId);
		if (brix === -1) {
			throw new Error(`Unable to find ingredient ${ingredientId}`);
		}
		return brix;
	}
	setBrix(componentId: string, newBrix: number, undoKey = `setBrix-${componentId}`): void {
		if (componentId === 'totals') {
			this.solveTotal('brix', newBrix);
			return;
		}
		const originalBrix = this.getBrix(componentId);
		const makeUpdater = (targetBrix: number) => {
			return (data: MixtureStoreData) => {
				const mxc = this.findIngredient(componentId, data.mixture);
				if (!mxc) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				const mixture = mxc.item;
				if (mixture instanceof Mixture) {
					const syrup = mixture.clone();
					syrup.setBrix(targetBrix);
					if (!roundEq(syrup.brix, targetBrix)) {
						throw new Error(`Unable to set requested brix of mixture ${componentId}`);
					}
					mixture.updateFrom(syrup);
				} else {
					throw new Error(`Unable to set brix of component ${componentId}`);
				}

				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newBrix), undoer: makeUpdater(originalBrix) });
	}
	updateComponentName(
		componentId: string,
		newName: string,
		undoKey = `updateComponentName-${componentId}`,
	): void {
		const mcx = this.findIngredient(componentId);
		if (!mcx) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		const originalName = mcx.name;
		const makeUpdater = (targetName: string) => {
			return (data: MixtureStoreData) => {
				const mcx = this.findIngredient(componentId, data.mixture);
				if (!mcx) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				mcx.name = targetName;
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newName), undoer: makeUpdater(originalName) });
	}
	private getSweetenerTypes(id: string): SweetenerTypes[] {
		const mcx = this.findIngredient(id, this.mixture);
		if (!mcx) {
			throw new Error(`Unable to find component ${id}`);
		}
		const maybeSubstance = mcx.item;
		if (isSweetenerSubstance(maybeSubstance)) {
			return [maybeSubstance.substanceId as SweetenerTypes];
		}
		const maybeMixture = mcx.item;
		if (isSweetenerMixture(maybeMixture) || isSyrup(maybeMixture)) {
			const substances = [...maybeMixture.makeSubstanceMap().values()];
			return substances
				.filter((x) => isSweetenerSubstance(x.item))
				.map((x) => x.item.substanceId as SweetenerTypes);
		}
		return [];
	}
	updateSweetenerType(
		id: string,
		newType: SweetenerTypes,
		undoKey = `updateSweetenerSubType-${id}`,
	): void {
		const originalTypes = this.getSweetenerTypes(id);
		if (originalTypes.length !== 1) {
			throw new Error(`Unable to update complex sweetener ${id}`);
		}
		const [originalType] = originalTypes;
		const makeUpdater = (targetType: SweetenerTypes) => {
			return (data: MixtureStoreData) => {
				const mcx = this.findIngredient(id, this.mixture);
				if (!mcx) {
					throw new Error(`Unable to find component ${id}`);
				}
				// replace every sweetener with the new type
				for (const substance of data.mixture.eachSubstance()) {
					if (isSweetenerId(substance.item.substanceId)) {
						data.mixture.replaceIngredientComponent(
							substance.ingredientId,
							SubstanceComponent.new(targetType),
						);
					}
				}
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newType), undoer: makeUpdater(originalType) });
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
		this.update({ undoKey, updater: makeUpdater(newValue), undoer: makeUpdater(originalValue) });
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
			working = solver(mixture, {
				abv: targetValue,
				brix: mixture.brix,
				volume: mixture.volume,
				pH: mixture.pH,
			});
			working.setVolume(mixture.volume);
			break;
		case 'brix':
			working = solver(mixture, {
				abv: mixture.abv,
				brix: targetValue,
				volume: mixture.volume,
				pH: mixture.pH,
			});
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

	for (const { ingredient } of working.eachIngredient()) {
		mixture.ingredients.get(ingredient.id)!.proportion = ingredient.proportion;
	}
	mixture.setMass(working.mass);
}
