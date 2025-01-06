import { type Updater } from 'svelte/store';
import { SubstanceComponent } from './ingredients/substance-component.js';
import { digitsForDisplay, getTotals, type Analysis } from './utils.js';
import {
	componentId,
	isSweetenerMixture,
	isSweetenerSubstance,
	isSyrup,
	Mixture,
} from './mixture.js';
import { solver } from './solver.js';
import { type StorageId } from './storage-id.js';
import { UndoRedo } from './undo-redo.svelte.js';
import { decrement, increment, type MinMax } from './increment-decrement.js';
import { isSweetenerId, Sweeteners } from './ingredients/substances.js';
import type { IngredientItem, IngredientToAdd } from './mixture-types.js';

const SweetenerTypes = Sweeteners.map(({ id }) => id);
type SweetenerTypes = (typeof SweetenerTypes)[number];

type EditableComponentType = 'abv' | 'brix' | 'volume' | 'mass';

// exported for testing
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

	private findIngredient(
		id: string,
		mixture = this.mixture,
	): { ingredient: IngredientItem; parentId: string } | { ingredient: null; parentId: null } {
		if (id === 'totals') {
			return {
				ingredient: { id, name: 'totals', desiredMass: 1, item: mixture },
				parentId: mixture.id,
			};
		}
		for (const { ingredient } of mixture.eachIngredient()) {
			if (ingredient.id === id) {
				return { ingredient, parentId: mixture.id };
			}
		}
		for (const { ingredient } of mixture.eachIngredient()) {
			if (ingredient.item instanceof Mixture) {
				const found = this.findIngredient(id, ingredient.item);
				if (found) return found;
			}
		}
		return { ingredient: null, parentId: null };
	}

	findMixture(id: string) {
		const { ingredient } = this.findIngredient(id);
		if (ingredient && ingredient.item instanceof Mixture) {
			return ingredient.item;
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
					const { ingredient: targetMx } = this.findIngredient(parentId, data.mixture);
					if (!targetMx) {
						throw new Error(`Unable to find component ${parentId}`);
					}
					if (!(targetMx.item instanceof Mixture)) {
						throw new Error(`Ingredient ${parentId} is not a mixture`);
					}
					targetMx.item.addIngredient({ id: newId, ...ingredientItem });
				}
				return data;
			},
			undoer: (data) => {
				removeIngredient(data.mixture, newId);
				return data;
			},
		});
		return newId;
	}
	removeIngredient(id: string, undoKey = `removeIngredient-${id}`) {
		const { ingredient: targetIngredient, parentId } = this.findIngredient(id);
		if (!targetIngredient || !parentId) {
			throw new Error(`Unable to find component ${id}`);
		}

		const ingredientToAdd: IngredientToAdd = {
			name: targetIngredient.name,
			desiredMass: getIngredientMass(this.mixture, id),
			item: targetIngredient.item,
		};

		this.update({
			undoKey,
			updater: (data) => {
				removeIngredient(data.mixture, id);
				return data;
			},
			undoer: (data) => {
				const parentMx = this.findMixture(parentId);
				if (!parentMx) {
					throw new Error(`Unable to find parent component ${parentId}`);
				}
				parentMx.addIngredient(ingredientToAdd);
				return data;
			},
		});
	}
	increment(key: EditableComponentType, componentId: string, minMax?: MinMax) {
		const { ingredient } = this.findIngredient(componentId);
		if (!ingredient) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		if (!this.mixture.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		const originalValue = this.mixture.get(ingredient, key);
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
		const { ingredient } = this.findIngredient(componentId);
		if (!ingredient) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		if (!this.mixture.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		const originalValue = this.mixture.get(ingredient, key);
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
		return getIngredientVolume(this.mixture, id);
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
				const { ingredient } = this.findIngredient(id, working);
				const item = ingredient?.item;
				if (!item) {
					throw new Error(`Unable to find component ${id}`);
				}

				setIngredientVolume(working, id, targetVolume);
				if (!roundEq(getIngredientVolume(working, id), targetVolume)) {
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
			: getIngredientAbv(this.mixture, ingredientId);
	}
	setAbv(id: string, newAbv: number, undoKey = `setAbv-${id}`): void {
		if (id === 'totals') {
			this.solveTotal('abv', newAbv);
			return;
		}
		const originalAbv = this.getAbv(id);
		const makeUpdater = (targetAbv: number) => {
			return (data: MixtureStoreData) => {
				const { ingredient } = this.findIngredient(id, data.mixture);
				if (!ingredient) {
					throw new Error(`Unable to find component ${id}`);
				}
				if (!(ingredient.item instanceof Mixture)) {
					throw new Error(`Unable to set abv of substance ${id}`);
				}
				if (!ingredient.item.eachSubstance().some((s) => s.item.substanceId === 'ethanol')) {
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
		return id === 'totals' ? this.totals.mass : getIngredientMass(this.mixture, id);
	}
	setMass(componentId: string, newMass: number, undoKey = `setMass-${componentId}`): void {
		if (componentId === 'totals') {
			throw new Error('Cannot set mass of totals');
		}
		const originalMass = this.getMass(componentId);
		const makeUpdater = (targetMass: number) => {
			return (data: MixtureStoreData) => {
				setIngredientMass(data.mixture, componentId, targetMass);
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newMass), undoer: makeUpdater(originalMass) });
	}
	getBrix(ingredientId = 'totals') {
		if (ingredientId === 'totals') {
			return this.totals.brix;
		}
		const brix = getIngredientBrix(this.mixture, ingredientId);
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
				const { ingredient } = this.findIngredient(componentId, data.mixture);
				if (!ingredient) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				const mixture = ingredient.item;
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
		const { ingredient } = this.findIngredient(componentId);
		if (!ingredient) {
			throw new Error(`Unable to find component ${componentId}`);
		}
		const originalName = ingredient.name;
		const makeUpdater = (targetName: string) => {
			return (data: MixtureStoreData) => {
				const { ingredient } = this.findIngredient(componentId, data.mixture);
				if (!ingredient) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				ingredient.name = targetName;
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newName), undoer: makeUpdater(originalName) });
	}
	private getSweetenerTypes(id: string): SweetenerTypes[] {
		const { ingredient } = this.findIngredient(id, this.mixture);
		if (!ingredient) {
			throw new Error(`Unable to find component ${id}`);
		}
		const maybeSubstance = ingredient.item;
		if (isSweetenerSubstance(maybeSubstance)) {
			return [maybeSubstance.substanceId as SweetenerTypes];
		}
		const maybeMixture = ingredient.item;
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
		mixture.ingredients.get(ingredient.id)!.desiredMass = ingredient.desiredMass;
	}
	mixture.setMass(working.mass);
}

function recursiveGet(getter: (mx: Mixture) => number | -1, mixture: Mixture): number | -1 {
	const value = getter(mixture);
	if (value !== -1) return value;
	for (const ingredient of mixture.ingredients.values()) {
		if (ingredient.item instanceof Mixture) {
			const value = recursiveGet(getter, ingredient.item);
			if (value !== -1) return value;
		}
	}
	return -1;
}

function getIngredientAbv(mixture: Mixture, id: string): number | -1 {
	return recursiveGet((mx) => mx.getIngredientAbv(id), mixture);
}

function getIngredientBrix(mixture: Mixture, id: string): number | -1 {
	return recursiveGet((mx) => mx.getIngredientBrix(id), mixture);
}

function getIngredientVolume(mixture: Mixture, id: string): number | -1 {
	return recursiveGet((mx) => mx.getIngredientVolume(id), mixture);
}

function getIngredientMass(mixture: Mixture, id: string): number | -1 {
	return recursiveGet((mx) => mx.getIngredientMass(id), mixture);
}

function recursiveSet<T>(
	setter: (mx: Mixture, value: T) => boolean,
	mixture: Mixture,
	value: T,
): boolean {
	const wasSet = setter(mixture, value);
	if (wasSet) return true;
	for (const ingredient of mixture.ingredients.values()) {
		if (ingredient.item instanceof Mixture) {
			const wasSet = recursiveSet(setter, ingredient.item, value);
			if (wasSet) return true;
		}
	}
	return false;
}

function setIngredientVolume(mixture: Mixture, id: string, value: number): boolean {
	return recursiveSet((mx, value) => mx.setIngredientVolume(id, value), mixture, value);
}

function setIngredientMass(mixture: Mixture, id: string, value: number): boolean {
	return recursiveSet((mx, value) => mx.setIngredientMass(id, value), mixture, value);
}

function removeIngredient(mixture: Mixture, id: string): boolean {
	return recursiveSet((mx) => mx.removeIngredient(id), mixture, undefined);
}
