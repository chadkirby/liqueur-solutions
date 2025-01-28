import { type Updater } from 'svelte/store';
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
	IngredientToAdd,
	MixtureAnalysis,
	SolverTarget,
} from './mixture-types.js';
import { deep } from './deep-mixture.js';
import { citrusFactory } from './mixture-factories.js';
import {
	citrusJuiceNames,
	getCitrusPrefix,
	makeCitrusId,
	type CitrusJuiceId,
	type CitrusJuiceIdPrefix,
	type CitrusJuiceName,
} from './ingredients/citrus-ids.js';

// exported for testing
export type MixtureStoreData = {
	storeId: StorageId;
	name: string;
	mixture: Mixture;
	totals: MixtureAnalysis;
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
		id: string | 'totals',
		mixture = this.mixture,
	): { ingredient: IngredientItem; parentId: string } | { ingredient: null; parentId: null } {
		if (id === 'totals') {
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
			mass: deep.getIngredientMass(this.mixture, id),
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

	increment(key: EditableProperty, id: string | 'totals', minMax?: MinMax) {
		const { ingredient } = this.findIngredient(id);
		if (!ingredient) {
			throw new Error(`Unable to find component ${id}`);
		}
		if (!this.mixture.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		const originalValue =
			id === 'totals' ? this.mixture[key] : this.mixture.getIngredientValue(ingredient, key);
		const newValue = increment(originalValue, minMax);
		if (newValue === originalValue) return;

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
		}
	}

	decrement(key: EditableProperty, id: string | 'totals', minMax?: MinMax) {
		const { ingredient } = this.findIngredient(id);
		if (!ingredient) {
			throw new Error(`Unable to find component ${id}`);
		}
		if (!this.mixture.canEdit(key)) {
			throw new Error(`${key} is not editable`);
		}
		const originalValue =
			id === 'totals' ? this.mixture[key] : this.mixture.getIngredientValue(ingredient, key);
		const newValue = decrement(originalValue, minMax);
		if (newValue === originalValue) return;

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
		}
	}

	getVolume(id: string | 'totals' = 'totals') {
		if (id === 'totals') {
			return this.totals.volume;
		}
		const mxc = this.findIngredient(id);
		if (!mxc) {
			throw new Error(`Unable to find component ${id}`);
		}
		return deep.getIngredientVolume(this.mixture, id);
	}

	setVolume(id: string | 'totals', newVolume: number, undoKey = `setVolume-${id}`): void {
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

				deep.setIngredientVolume(working, id, targetVolume);
				if (!roundEq(deep.getIngredientVolume(working, id), targetVolume)) {
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
			: deep.getIngredientAbv(this.mixture, ingredientId);
	}

	setAbv(id: string | 'totals', newAbv: number, undoKey = `setAbv-${id}`): void {
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
				const mx = ingredient.item;
				if (!mx.eachSubstance().some((s) => s.item.substanceId === 'ethanol')) {
					throw new Error(`Mixture has no ethanol ${id}`);
				}
				if (!isClose(targetAbv, mx.abv, 0.001)) {
					try {
						const targetVolume = this.mixture.getIngredientVolume(id);
						const working = solver(mx, {
							volume: targetVolume,
							abv: targetAbv,
							brix: mx.brix,
							pH: mx.pH,
						});
						mx.updateFrom(working);
						// the ingredient has the correct proportions now, but we
						// need to update its mass in its parent mixture
						deep.setIngredientMass(data.mixture, id, working.mass);
					} catch (error) {
						throw new Error(`Unable to solve for abv = ${newAbv}`);
					}
				}
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newAbv), undoer: makeUpdater(originalAbv) });
	}

	getMass(id: string | 'totals' = 'totals') {
		return id === 'totals' ? this.totals.mass : deep.getIngredientMass(this.mixture, id);
	}

	setMass(componentId: string, newMass: number, undoKey = `setMass-${componentId}`): void {
		if (componentId === 'totals') {
			throw new Error('Cannot set mass of totals');
		}
		const originalMass = this.getMass(componentId);
		const makeUpdater = (targetMass: number) => {
			return (data: MixtureStoreData) => {
				deep.setIngredientMass(data.mixture, componentId, targetMass);
				return data;
			};
		};
		this.update({ undoKey, updater: makeUpdater(newMass), undoer: makeUpdater(originalMass) });
	}

	getBrix(ingredientId = 'totals') {
		if (ingredientId === 'totals') {
			return this.totals.brix;
		}
		const brix = deep.getIngredientBrix(this.mixture, ingredientId);
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

	getPH(ingredientId = 'totals') {
		if (ingredientId === 'totals') {
			return this.totals.pH;
		}
		const pH = deep.getIngredientPH(this.mixture, ingredientId);
		if (pH === -1) {
			throw new Error(`Unable to find ingredient ${ingredientId}`);
		}
		return pH;
	}

	setPH(componentId: string, newPH: number, undoKey = `setPH-${componentId}`): void {
		if (componentId === 'totals') {
			this.solveTotal('pH', newPH);
			return;
		}
		const originalPH = this.getPH(componentId);
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
		const { ingredient } = this.findIngredient(id, this.mixture);
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
		const { ingredient } = this.findIngredient(id, this.mixture);
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
		const { ingredient } = this.findIngredient(id, this.mixture);
		if (!ingredient) {
			throw new Error(`Unable to find component ${id}`);
		}
		if (!isSubstance(ingredient.item)) {
			throw new Error(`Unable to set acid type of mixture ${id}`);
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
				const newJuice = citrusFactory[newName](deep.getIngredientVolume(data.mixture, id));

				data.mixture.replaceIngredient(id, {
					id: makeCitrusId(newName),
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
		const originalValue = this.totals[key];
		const makeUpdater = (targetValue: number) => {
			return (data: MixtureStoreData) => {
				const working = solveTotal(this.mixture, key, targetValue);
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

	mixture.updateFrom(working);
	return mixture;
}
