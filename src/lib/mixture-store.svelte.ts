import { type Updater, writable, type Writable } from 'svelte/store';
import { SubstanceComponent } from './ingredients/substance-component.js';
import { digitsForDisplay, getTotals } from './utils.js';
import {
	componentId,
	isMixture,
	isSubstance,
	isSweetener,
	isSweetenerSubstance,
	isSyrup,
	Mixture,
} from './mixture.js';
import { isClose, solver } from './solver.js';
import { type StorageId } from './storage-id.js';
import { UndoRedo } from './undo-redo.svelte.js';
import { decrement, increment, type MinMax } from './increment-decrement.js';
import {
	isAcidId,
	isSaltId,
	isSweetenerId,
	type AcidType,
	type SaltType,
	type SweetenerType,
} from './ingredients/substances.js';
import type {
	EditableProperty,
	IngredientItem,
	IngredientItemComponent,
	IngredientToAdd,
	MixtureAnalysis,
	SolverTarget,
} from './mixture-types.js';
import { deep, deepGet } from './deep-mixture.js';
import { citrusFactory } from './mixture-factories.js';
import {
	citrusJuiceNames,
	getCitrusPrefix,
	type CitrusJuiceIdPrefix,
	type CitrusJuiceName,
} from './ingredients/citrus-ids.js';

// exported for testing
export type MixtureStoreData = {
	storeId: StorageId;
	name: string;
	mixture: Mixture;
	totals: MixtureAnalysis;
	ingredientHash: string;
};

export const loadingStoreId = '/loading' as StorageId;

function newData(): MixtureStoreData {
	const mx = new Mixture();
	return {
		storeId: loadingStoreId,
		name: '',
		mixture: mx,
		totals: getTotals(mx),
		ingredientHash: mx.getIngredientHash(''),
	};
}

export class MixtureStore {
	/**
	 * _data is the current state of the store. It must be reactive for
	 * all of the UI to work.
	 */
	private _data = $state(newData());

	// define several (reactive) properties getters to access
	// the store data.
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

	get ingredientHash() {
		return this._data.ingredientHash;
	}

	private _store: Writable<MixtureStoreData> = writable(this._data);
	readonly subscribe = this._store.subscribe;

	/**
	 * Create a new MixtureStore
	 * @param data initial store data
	 */
	constructor(data: MixtureStoreData = newData()) {
		this._save(data);
	}

	snapshot(): MixtureStoreData {
		return {
			...this._data,
			mixture: this._data.mixture.clone(),
		};
	}

	private findIngredient(
		id: string,
		mixture = this._data.mixture,
	): { ingredient: IngredientItem; parentId: string } | { ingredient: null; parentId: null } {
		if (id === 'totals') {
			throw new Error("Don't use 'totals'");
		}
		if (id === mixture.id) {
			return {
				ingredient: { id, name: 'totals', mass: 1, item: mixture },
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
				if (found.ingredient) return found;
			}
		}
		return { ingredient: null, parentId: null };
	}

	findMixture(id: string) {
		const mx = this._data.mixture;
		if (id === mx.id) {
			return mx;
		}
		const { ingredient } = this.findIngredient(id);
		if (ingredient && ingredient.item instanceof Mixture) {
			return ingredient.item;
		}
		return null;
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
			newData.ingredientHash = newData.mixture.getIngredientHash(newData.name);
		}
		this._save(newData);
		return newData;
	}

	private _save(newData: MixtureStoreData) {
		this._data = { ...newData };
		this._store.set(this._data);
	}

	setName(newName: string, undoKey = 'setName') {
		const originalName = this._data.name;
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
		const newId = isMixture(ingredientItem.item)
			? ingredientItem.item.updateIds().id
			: componentId();
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
				deep.removeIngredient(data.mixture, newId);
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
			mass: deepGet((mx) => mx.getIngredientMass(id), this._data.mixture) || -1,
			item: targetIngredient.item,
		};

		this.update({
			undoKey,
			updater: (data) => {
				deep.removeIngredient(data.mixture, id);
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

	increment(key: EditableProperty, id: string | 'totals', minMax?: MinMax): number {
		const { ingredient } = this.findIngredient(id);
		if (!ingredient) {
			throw new Error(`Unable to find ingredient ${id}`);
		}
		const mx = this._data.mixture;
		if (!mx.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		if (id === 'totals') {
			throw new Error("Don't use 'totals'");
		}
		const originalValue = id === mx.id ? mx[key] : this.get(key, id);
		const newValue = increment(originalValue, minMax);
		if (newValue === originalValue) return originalValue;

		const actionDesc = `increment-${key}-${id}`;
		switch (key) {
			case 'volume':
				return this.setVolume(id, newValue, actionDesc);
			case 'abv':
				return this.setAbv(id, newValue, actionDesc);
			case 'brix':
				return this.setBrix(id, newValue, actionDesc);
			case 'mass':
				return this.setMass(id, newValue, actionDesc);
			case 'pH':
				return this.setPH(id, newValue, actionDesc);
			default:
				key satisfies never;
				throw new Error(`Invalid key: ${key}`);
		}
	}

	decrement(key: EditableProperty, id: string, minMax?: MinMax): number {
		const { ingredient } = this.findIngredient(id);
		if (!ingredient) {
			throw new Error(`Unable to find component ${id}`);
		}
		const mx = this._data.mixture;
		if (!mx.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		if (id === 'totals') {
			throw new Error("Don't use 'totals'");
		}
		const originalValue = id === mx.id ? mx[key] : this.get(key, id);
		const newValue = decrement(originalValue, minMax);
		if (newValue === originalValue) return originalValue;

		const actionDesc = `decrement-${key}-${id}`;
		switch (key) {
			case 'volume':
				return this.setVolume(id, newValue, actionDesc);
			case 'abv':
				return this.setAbv(id, newValue, actionDesc);
			case 'brix':
				return this.setBrix(id, newValue, actionDesc);
			case 'mass':
				return this.setMass(id, newValue, actionDesc);
			case 'pH':
				return this.setPH(id, newValue, actionDesc);
			default:
				key satisfies never;
				throw new Error(`Invalid key: ${key}`);
		}
	}

	get(key: EditableProperty, id = this._data.mixture.id): number {
		if (id === 'totals') {
			throw new Error("don't use 'totals'");
		}
		const mx = this._data.mixture;
		if (id === mx.id) {
			return this._data.totals[key];
		}
		let value: number | false;
		switch (key) {
			case 'abv':
				value = deepGet((mx) => mx.getIngredientAbv(id), mx);
				break;
			case 'brix':
				value = deepGet((mx) => mx.getIngredientBrix(id), mx);
				break;
			case 'mass':
				value = deepGet((mx) => mx.getIngredientMass(id), mx);
				break;
			case 'pH':
				value = deepGet((mx) => (mx.id === id ? mx.getPH() : -1), mx);
				break;
			case 'volume':
				value = deepGet((mx) => mx.getIngredientVolume(id), mx);
				break;
			default:
				key satisfies never;
				throw new Error(`Invalid key: ${key}`);
		}
		if (value === false) {
			throw new Error(`Ingredient with id ${id} not found`);
		}
		return value;
	}

	setVolume(id: string, newVolume: number, undoKey = `setVolume-${id}`): number {
		const originalVolume = this.get('volume', id);
		if (id === 'totals') {
			throw new Error("Don't use 'totals'");
		}
		const mx = this._data.mixture;
		if (id === mx.id) {
			this.solveTotal('volume', newVolume);
			return newVolume;
		}
		const makeUpdater = (targetVolume: number) => {
			return (data: MixtureStoreData) => {
				const working = data.mixture.clone();
				const { ingredient } = this.findIngredient(id, working);
				const item = ingredient?.item;
				if (!item) {
					throw new Error(`Unable to find component ${id}`);
				}

				deep.setIngredientVolume(working, id, targetVolume);
				if (!roundEq(deepGet((mx) => mx.getIngredientVolume(id), working) || -1, targetVolume)) {
					throw new Error(`Unable to set requested volume of component ${id}`);
				}

				data.mixture = working;

				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newVolume), undoer: makeUpdater(originalVolume) });
		return newVolume;
	}

	setAbv(id: string, newAbv: number, undoKey = `setAbv-${id}`): number {
		if (id === 'totals') {
			throw new Error("Don't use 'totals'");
		}
		const mx = this._data.mixture;
		if (id === mx.id) {
			this.solveTotal('abv', newAbv);
			return this._data.totals.abv;
		}
		const originalAbv = this.get('abv', id);
		const makeUpdater = (targetAbv: number) => {
			return (data: MixtureStoreData) => {
				const { ingredient, parentId } = this.findIngredient(id, data.mixture);
				if (!ingredient) {
					throw new Error(`Unable to find component ${id}`);
				}
				if (!(ingredient.item instanceof Mixture)) {
					throw new Error(`Unable to set abv of substance ${id}`);
				}
				const mx = ingredient.item;
				if (!mx.eachSubstance().some((s) => s.item.substanceId === 'ethanol')) {
					throw new Error(`Mixture has no ethanol ${id}`);
				}
				if (!isClose(targetAbv, mx.abv, 0.001)) {
					try {
						const originalMass = mx.mass;
						const working = solver(mx, {
							volume: mx.volume,
							abv: targetAbv,
							brix: mx.brix,
							pH: mx.pH,
						});
						mx.updateFrom(working);
						// the ingredient has the correct proportions now, but we
						// need to update its mass in its parent mixture
						const massFactor = originalMass / mx.mass;
						const parentMx = this.findMixture(parentId);
						if (!parentMx) {
							throw new Error(`Unable to find parent component ${parentId}`);
						}
						parentMx.scaleIngredientMass(id, massFactor);
					} catch (error) {
						throw new Error(`Unable to solve for abv = ${newAbv}`);
					}
				}
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newAbv), undoer: makeUpdater(originalAbv) });
		return newAbv;
	}

	setMass(componentId: string, newMass: number, undoKey = `setMass-${componentId}`): number {
		if (componentId === 'totals') {
			throw new Error("Don't use 'totals'");
		}
		const mx = this._data.mixture;
		if (componentId === mx.id) {
			throw new Error('Cannot set mass of totals');
		}
		const originalMass = this.get('mass', componentId);
		const makeUpdater = (targetMass: number) => {
			return (data: MixtureStoreData) => {
				deep.setIngredientMass(data.mixture, componentId, targetMass);
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newMass), undoer: makeUpdater(originalMass) });
		return newMass;
	}

	setBrix(componentId: string, newBrix: number, undoKey = `setBrix-${componentId}`): number {
		if (componentId === 'totals') {
			throw new Error("Don't use 'totals'");
		}
		const mx = this._data.mixture;
		if (componentId === mx.id) {
			this.solveTotal('brix', newBrix);
			return this._data.totals.brix;
		}
		const originalBrix = this.get('brix', componentId);
		const makeUpdater = (targetBrix: number) => {
			return (data: MixtureStoreData) => {
				const { ingredient } = this.findIngredient(componentId, data.mixture);
				if (!ingredient) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				if (ingredient.item instanceof Mixture) {
					const workingSyrup = ingredient.item.clone();
					workingSyrup.setBrix(targetBrix);
					if (!roundEq(workingSyrup.brix, targetBrix)) {
						throw new Error(`Unable to set requested brix of mixture ${componentId}`);
					}
					ingredient.item.updateFrom(workingSyrup);
				} else {
					throw new Error(`Unable to set brix of component ${componentId}`);
				}

				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newBrix), undoer: makeUpdater(originalBrix) });
		return newBrix;
	}

	setPH(componentId: string, newPH: number, undoKey = `setPH-${componentId}`): number {
		if (componentId === 'totals') {
			throw new Error("Don't use 'totals'");
		}
		const mx = this._data.mixture;
		if (componentId === mx.id) {
			this.solveTotal('pH', newPH);
			return this._data.totals.pH;
		}
		const originalPH = this.get('pH', componentId);
		const makeUpdater = (targetPH: number) => {
			return (data: MixtureStoreData) => {
				const { ingredient } = this.findIngredient(componentId, data.mixture);
				if (!ingredient) {
					throw new Error(`Unable to find component ${componentId}`);
				}
				const mixture = ingredient.item;
				if (mixture instanceof Mixture) {
					mixture.setPH(targetPH);
					if (!roundEq(mixture.pH, targetPH)) {
						throw new Error(`Unable to set requested pH of mixture ${componentId}`);
					}
				} else {
					throw new Error(`Unable to set pH of component ${componentId}`);
				}

				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newPH), undoer: makeUpdater(originalPH) });
		return newPH;
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

	getSweetenerTypes(id: string): SweetenerType[] {
		const { ingredient } = this.findIngredient(id, this._data.mixture);
		if (!ingredient) {
			throw new Error(`Unable to find component ${id}`);
		}
		const ingredientIsSweetener = isSweetener(ingredient.item);
		if (isSubstance(ingredient.item) && ingredientIsSweetener) {
			return [ingredient.item.substanceId as SweetenerType];
		}
		if (isMixture(ingredient.item) && (ingredientIsSweetener || isSyrup(ingredient.item))) {
			const substances = [...ingredient.item.makeSubstanceMap().values()];
			return substances
				.filter((x) => isSweetenerSubstance(x.item))
				.map((x) => x.item.substanceId as SweetenerType);
		}
		return [];
	}

	updateSweetenerType(
		id: string,
		newType: SweetenerType,
		undoKey = `updateSweetenerType-${id}`,
	): void {
		const originalTypes = this.getSweetenerTypes(id);
		if (originalTypes.length !== 1) {
			throw new Error(`Unable to update complex sweetener ${id}`);
		}
		const [originalType] = originalTypes;
		const makeUpdater = (targetType: SweetenerType) => {
			return (data: MixtureStoreData) => {
				const { ingredient } = this.findIngredient(id, data.mixture);
				if (!ingredient) {
					throw new Error(`Unable to find component ${id}`);
				}
				if (isSubstance(ingredient.item)) {
					data.mixture.replaceIngredientComponent(id, SubstanceComponent.new(targetType));
				} else if (isMixture(ingredient.item)) {
					// For a syrup, we need to find and replace its sweetener component
					for (const substance of ingredient.item.eachSubstance()) {
						if (isSweetenerId(substance.item.substanceId)) {
							ingredient.item.replaceIngredientComponent(
								substance.ingredientId,
								SubstanceComponent.new(targetType),
							);
						}
					}
				}
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newType), undoer: makeUpdater(originalType) });
	}

	updateAcidType(id: string, newType: AcidType, undoKey = `updateAcidType-${id}`): void {
		const { ingredient } = this.findIngredient(id, this._data.mixture);
		if (!ingredient) {
			throw new Error(`Unable to find component ${id}`);
		}
		if (!isSubstance(ingredient.item)) {
			throw new Error(`Unable to set acid type of mixture ${id}`);
		}
		const originalAcidType = ingredient.item.substanceId;
		if (!isAcidId(originalAcidType)) {
			throw new Error(`${originalAcidType} is not an acid`);
		}
		const makeUpdater = (targetType: AcidType) => {
			return (data: MixtureStoreData) => {
				data.mixture.replaceIngredientComponent(id, SubstanceComponent.new(targetType));
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newType), undoer: makeUpdater(originalAcidType) });
	}

	updateSaltType(id: string, newType: SaltType, undoKey = `updateSaltType-${id}`): void {
		const { ingredient } = this.findIngredient(id, this._data.mixture);
		if (!ingredient) {
			throw new Error(`Unable to find component ${id}`);
		}
		if (!isSubstance(ingredient.item)) {
			throw new Error(`Unable to set salt type of mixture ${id}`);
		}
		const originalSaltType = ingredient.item.substanceId;
		if (!isSaltId(originalSaltType)) {
			throw new Error(`${originalSaltType} is not a salt`);
		}
		const makeUpdater = (targetType: SaltType) => {
			return (data: MixtureStoreData) => {
				data.mixture.replaceIngredientComponent(id, SubstanceComponent.new(targetType));
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newType), undoer: makeUpdater(originalSaltType) });
	}

	updateCitrusType(
		id: string,
		newCitrusId: CitrusJuiceIdPrefix,
		undoKey = `updateCitrusType-${id}`,
	): void {
		const newName = citrusJuiceNames.find((n) => newCitrusId.includes(n));
		if (!newName) {
			throw new Error(`Unable to find citrus component ${newCitrusId}`);
		}
		const originalCitrusPrefix = getCitrusPrefix(id);
		const originalName = citrusJuiceNames.find((n) => originalCitrusPrefix?.includes(n));
		if (!originalName) {
			throw new Error(`Unable to find citrus component ${id}`);
		}
		if (originalName === newName) return;
		const makeUpdater = (targetCitrus: CitrusJuiceName) => {
			return (data: MixtureStoreData) => {
				const mcx = this.findIngredient(id, data.mixture);
				if (!mcx) {
					throw new Error(`Unable to find component ${id}`);
				}
				const newJuice = citrusFactory[newName](
					deepGet((mx) => mx.getIngredientVolume(id), data.mixture) || 0,
				);

				data.mixture.replaceIngredient(id, {
					name: newName,
					mass: newJuice.mass,
					item: newJuice,
				});

				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newName), undoer: makeUpdater(originalName) });
	}

	solveTotal(key: keyof SolverTarget, newValue: number, undoKey = `solveTotal-${key}`): void {
		const originalValue = this._data.totals[key];
		const makeUpdater = (targetValue: number) => {
			return (data: MixtureStoreData) => {
				const working = solveTotal(data.mixture, key, targetValue);
				data.mixture.updateFrom(working);
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
			newData.ingredientHash = newData.mixture.getIngredientHash(newData.name);
		}
		while (undoItem.length) {
			newData = undoItem.pop()!(data);
			if (newData.mixture.isValid) {
				newData.totals = getTotals(newData.mixture);
				newData.ingredientHash = newData.mixture.getIngredientHash(newData.name);
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
			newData.ingredientHash = newData.mixture.getIngredientHash(newData.name);
		}
		while (redoItem.length) {
			newData = redoItem.shift()!(data);
			if (newData.mixture.isValid) {
				newData.totals = getTotals(newData.mixture);
				newData.ingredientHash = newData.mixture.getIngredientHash(newData.name);
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

function solveTotal(mixture: Mixture, key: keyof SolverTarget, targetValue: number): Mixture {
	if (!mixture.canEdit(key)) {
		throw new Error(`${key} is not editable`);
	}

	let working = mixture.clone();
	switch (key) {
		case 'volume':
			working.setVolume(targetValue);
			break;
		case 'abv':
			working.setAbv(targetValue);
			break;
		case 'brix':
			working.setBrix(targetValue);
			break;
		case 'pH':
			working.setPH(targetValue);
			break;
		default:
			key satisfies never;
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

	return working;
}

function getIngredientValue(
	{ item, mass }: { item: IngredientItemComponent; mass: number },
	what:
		| 'equivalentSugarMass'
		| 'alcoholMass'
		| 'waterVolume'
		| 'mass'
		| 'abv'
		| 'brix'
		| 'volume'
		| 'pH',
): number {
	switch (what) {
		case 'equivalentSugarMass':
			return item.getEquivalentSugarMass(mass);
		case 'alcoholMass':
			return item.getAlcoholMass(mass);
		case 'waterVolume':
			return item.getWaterVolume(mass);
		case 'mass':
			return mass;
		case 'abv':
			return item.getAbv();
		case 'brix':
			return item.getBrix();
		case 'volume':
			return item.getVolume(mass);
		case 'pH':
			return isMixture(item) ? item.getPH() : NaN;
		default:
			what satisfies never;
			throw new Error('Invalid property');
	}
}
