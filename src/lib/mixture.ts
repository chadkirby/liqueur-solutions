import { SubstanceComponent, isSubstanceData } from './ingredients/substance-component.js';
import { type Component } from './ingredients/substance-component.js';
import { setVolume, solver } from './solver.js';
import { analyze, brixToSyrupProportion, format, type Analysis } from './utils.js';
import type {
	IngredientDbData,
	MixtureData,
	StoredFileData,
} from './ingredients/substance-component.js';
import { nanoid } from 'nanoid';
import {
	getConjugateAcids,
	isSweetenerId,
	type SubstanceId,
	Sweeteners,
} from './ingredients/substances.js';
import { calculatePh, getMolarConcentration } from './ph-solver.js';
import { getCitrusDissociationFactor, getIdPrefix } from './citrus-ids.js';
import { FancyIterator } from './iterator.js';

export type MixtureEditKeys = 'brix' | 'abv' | 'volume' | 'mass' | 'pH';

const ethanolPureDensity = SubstanceComponent.new('ethanol').pureDensity;

export type IngredientItemComponent = Mixture | SubstanceComponent;

export type IngredientItem = {
	id: string;
	proportion: number;
	name: string;
	item: IngredientItemComponent;
};

export type IngredientToAdd = {
	id?: string;
	name: string;
	item: IngredientItemComponent;
	mass: number;
};

type DecoratedSubstance = {
	mass: number;
	substanceId: SubstanceId;
	ingredientId: string;
	item: SubstanceComponent;
};

type DecoratedIngredient = {
	ingredient: IngredientItem;
	mass: number;
};

function* eachSubstance(
	this: Mixture,
	ingredientIterator: Iterable<DecoratedIngredient>,
	ids: SubstanceId[] = [],
): Generator<DecoratedSubstance> {
	for (const { ingredient, mass: ingredientMass } of ingredientIterator) {
		const item = ingredient.item;
		if (item instanceof SubstanceComponent) {
			if (ids.length === 0 || ids.includes(item.substanceId)) {
				yield {
					substanceId: item.substanceId,
					ingredientId: ingredient.id,
					item: item,
					mass: ingredientMass,
				};
			}
		} else if (item instanceof Mixture) {
			const subMixture = item;
			for (const subSubstance of eachSubstance.call(this, item.eachIngredient(), ids)) {
				// the mass of the substance in this mixture is the proportion
				// of the sub-substance in the sub-mixture times the mass of
				// this ingredient
				yield {
					substanceId: subSubstance.substanceId,
					item: subSubstance.item,
					mass: (subSubstance.mass / subMixture.mass) * ingredientMass,
					ingredientId: ingredient.id,
				};
			}
		}
	}
}

/**
 * @property mass - The mass of the substance in the mixture
 * @property component - The substance component
 * @property ingredients - The mixture ingredients that contain the substance
 */
export type MappedSubstance = {
	mass: number;
	item: SubstanceComponent;
	ingredients: Array<{ ingredientId: string; mass: number }>;
};

export class Mixture implements Component {
	static fromStorageData(mixtureData: MixtureData, ingredientData: IngredientDbData) {
		const ingredients: Array<{
			id: string;
			proportion: number;
			name: string;
			item: SubstanceComponent | Mixture;
		}> = [];

		const db = new Map(ingredientData);
		for (const { id, proportion, name } of mixtureData.ingredients) {
			const data = db.get(id);
			if (!data) {
				throw new Error(`Ingredient ${id} not found in ingredientDb`);
			}
			if (isSubstanceData(data)) {
				ingredients.push({ id, proportion, name, item: new SubstanceComponent(data) });
			} else {
				ingredients.push({
					id,
					proportion,
					name,
					item: Mixture.fromStorageData(data, ingredientData),
				});
			}
		}
		return new Mixture(mixtureData.id, mixtureData.mass, ingredients);
	}

	public readonly ingredients: Map<string, IngredientItem> = new Map();

	constructor(
		private _id = componentId(),
		private _mass: number = 0,
		ingredients:
			| Array<{
					proportion: number;
					name: string;
					item: IngredientItemComponent;
			  }>
			| Array<{ name: string; mass: number; item: IngredientItemComponent }> = [],
	) {
		if (ingredients.length && 'mass' in ingredients[0]) {
			ingredients = ingredients as Array<{
				name: string;
				mass: number;
				item: IngredientItemComponent;
			}>;
			this._mass = ingredients.reduce((acc, { mass }) => acc + mass, 0);
			for (const ingredient of ingredients) {
				this.addInitialIngredient({
					proportion: ingredient.mass / this._mass,
					name: ingredient.name,
					item: ingredient.item,
				});
			}
		} else {
			ingredients = ingredients as Array<{
				proportion: number;
				name: string;
				item: IngredientItemComponent;
			}>;
			for (const ingredient of ingredients) {
				this.addInitialIngredient(ingredient);
			}
		}
		this.normalizeProportions();
	}

	clone(deep = true): this {
		const newIngredients = this.eachIngredient().map(({ ingredient }) => ({
			...ingredient,
			item: deep && ingredient.item instanceof Mixture ? ingredient.item.clone() : ingredient.item,
		}));
		return new Mixture(this.id, this.mass, newIngredients) as this;
	}

	/**
	 * update our data to match another mixture (opposite of clone)
	 */
	updateFrom(other: Mixture) {
		this._mass = other.mass;
		this.ingredients.clear();
		for (const { ingredient } of other.eachIngredient()) {
			const newIngredient = {
				...ingredient,
				item: ingredient.item instanceof Mixture ? ingredient.item.clone() : ingredient.item,
			};
			this.ingredients.set(newIngredient.id, newIngredient);
		}
		return this;
	}

	/**
	 * Get data in a format compatible with storage (ReadonlyJSONValue)
	 */
	toStorageData(): MixtureData {
		return {
			id: this.id,
			mass: this.mass,
			ingredients: [...this.ingredients.values()].map(({ id, proportion, name }) => ({
				id,
				proportion,
				name,
			})),
		} as const;
	}

	toStorageDbData(): IngredientDbData {
		return [...this.ingredients.values()].flatMap(({ id, item }) => {
			if (item instanceof Mixture) {
				return item.toStorageDbData();
			}
			return [[id, item.toStorageData()]];
		});
	}

	analyze(precision = 0): Analysis {
		return analyze(this, precision);
	}

	private addInitialIngredient(item: Omit<IngredientItem, 'id'>) {
		if (item.proportion < 0) {
			throw new Error('Invalid proportion');
		}

		const ingredient: IngredientItem = {
			id: componentId(),
			...item,
			item: item.item instanceof Mixture ? item.item.clone().updateIds() : item.item,
		};

		if (!ingredient.item?.isValid) {
			throw new Error('Invalid component');
		}

		this.ingredients.set(ingredient.id, ingredient);
	}

	/**
	 * Normalize the proportions of the mixture so they sum
	 * to 1.
	 */
	private normalizeProportions() {
		const sumOfProportions = [...this.ingredients.values()].reduce(
			(acc, { proportion }) => acc + proportion,
			0,
		);
		for (const ingredient of this.ingredients.values()) {
			ingredient.proportion /= sumOfProportions;
		}
		return this;
	}

	/**
	 * Add a quantity of an ingredient to the mixture and recompute
	 * proportions.
	 */
	addIngredient(ingredient: IngredientToAdd) {
		if (ingredient.mass < 0) {
			throw new Error('Invalid mass');
		}
		const ingredientItem: IngredientItem = {
			id: ingredient.id ?? componentId(),
			name: ingredient.name,
			item: ingredient.item,
			proportion: this.mass ? ingredient.mass / this.mass : 1,
		};
		this.ingredients.set(ingredientItem.id, ingredientItem);
		this._mass += ingredient.mass;
		return this.normalizeProportions();
	}

	removeIngredient(id: string) {
		if (this.ingredients.has(id)) {
			this._mass -= this.getIngredientMass(id);
			this.ingredients.delete(id);
			this.normalizeProportions();
			return true;
		}
		for (const ingredient of this.ingredients.values()) {
			if (ingredient.item instanceof Mixture) {
				if (ingredient.item.removeIngredient(id)) {
					return true;
				}
			}
		}
		return false;
	}

	replaceIngredientComponent(id: string, item: IngredientItemComponent) {
		if (this.ingredients.has(id)) {
			const ingredient = this.ingredients.get(id)!;
			ingredient.item = item;
			return true;
		}
		for (const ingredient of this.ingredients.values()) {
			if (ingredient.item instanceof Mixture) {
				if (ingredient.item.replaceIngredientComponent(id, item)) {
					return true;
				}
			}
		}
		return false;
	}

	get id() {
		return this._id;
	}

	get mass() {
		return this._mass;
	}

	setMass(newMass: number) {
		if (newMass < 0) {
			throw new Error('Invalid mass');
		}
		this._mass = newMass;
		return this;
	}

	get label() {
		if (isSpirit(this)) return 'spirit';
		if (isSyrup(this)) return 'simple syrup';
		if (isLiqueur(this)) return 'liqueur';
		return 'mixture';
	}

	get ingredientIds() {
		return [...this.ingredients.keys()];
	}

	eachIngredient() {
		function* eachIngredient(this: Mixture): Generator<DecoratedIngredient> {
			for (const ingredient of this.ingredients.values()) {
				yield { ingredient, mass: this.getIngredientMass(ingredient.id) };
			}
		}

		return new FancyIterator(eachIngredient.apply(this));
	}

	get substances(): DecoratedSubstance[] {
		return [...this.eachSubstance()];
	}

	eachSubstance(...ids: SubstanceId[]) {
		return new FancyIterator(eachSubstance.call(this, this.eachIngredient(), ids));
	}

	someSubstance(predicate: (substance: SubstanceComponent) => boolean): boolean {
		for (const substance of this.eachSubstance()) {
			if (predicate(substance.item)) return true;
		}
		return false;
	}

	everySubstance(predicate: (substance: SubstanceComponent) => boolean): boolean {
		for (const substance of this.eachSubstance()) {
			if (!predicate(substance.item)) return false;
		}
		return true;
	}

	hasEverySubstances(substanceIds: SubstanceId[]): boolean {
		const need = new Set(substanceIds);
		const have = new Set<SubstanceId>();
		for (const substance of this.eachSubstance()) {
			if (need.has(substance.item.substanceId)) {
				have.add(substance.item.substanceId);
				if (have.size === need.size) return true;
			}
		}
		return false;
	}
	hasAnySubstances(...substanceIds: SubstanceId[]): boolean {
		for (const substance of this.eachSubstance()) {
			if (substanceIds.includes(substance.item.substanceId)) return true;
		}
		return false;
	}

	describe(): string {
		if (isSyrup(this)) {
			const sweeteners = this.eachSubstance()
				.filter((x) => Sweeteners.some((s) => s.id === x.substanceId))
				.sort(
					(a, b) => b.item.getEquivalentSugarMass(b.mass) - a.item.getEquivalentSugarMass(a.mass),
				);
			const summary = [
				brixToSyrupProportion(this.brix),
				`${sweeteners.map((s) => s.item.name).join('/')} syrup`,
			];
			return summary.join(' ').replace('sucrose syrup', 'simple syrup');
		}
		if (isSpirit(this)) {
			return `spirit`;
		}
		if (isLiqueur(this)) {
			return `${format(this.proof, { unit: 'proof' })} ${format(this.brix, { unit: 'brix' })} liqueur`;
		}
		return this.eachIngredient()
			.map(({ ingredient }) => ingredient.item.describe())
			.join(', ');
	}

	updateIds() {
		this._id = `${getIdPrefix(this.id)}${componentId()}`;
		for (const { ingredient } of this.eachIngredient()) {
			if (ingredient.item instanceof Mixture) {
				ingredient.item.updateIds();
			}
		}
		return this;
	}

	findIngredient(
		predicate: (item: IngredientItemComponent) => boolean,
	): IngredientItem | undefined {
		for (const { ingredient } of this.eachIngredient()) {
			if (predicate(ingredient.item)) return ingredient;
		}
		return undefined;
	}

	canEdit(key: MixtureEditKeys | string): boolean {
		if (key === 'brix') {
			return this.hasAnySubstances(...Sweeteners.map((s) => s.id));
		}
		if (key === 'abv') {
			return this.hasAnySubstances('ethanol');
		}
		if (key === 'volume' || key === 'mass') {
			return true;
		}
		if (key === 'pH') {
			return this.someSubstance((x) => x.pKa.length > 0);
		}
		return false;
	}

	/**
	 * Return a map of substances to their total mass in the mixture.
	 */
	makeSubstanceMap() {
		const substanceMap = new Map<SubstanceId, MappedSubstance>();

		for (const substance of this.eachSubstance()) {
			const { substanceId, ingredientId } = substance;
			const mapSubstance = substanceMap.get(substanceId)!;
			if (mapSubstance) {
				mapSubstance.mass += substance.mass;
				mapSubstance.ingredients.push({ ingredientId, mass: substance.mass });
			} else {
				substanceMap.set(substanceId, {
					mass: substance.mass,
					item: SubstanceComponent.new(substanceId),
					ingredients: [{ ingredientId, mass: substance.mass }],
				});
			}
		}
		return substanceMap;
	}

	get abv() {
		return this.getAbv();
	}
	getAbv() {
		const ethanol = this.makeSubstanceMap().get('ethanol');
		if (!ethanol?.mass) return 0;
		const volume = this.volume;
		const ethanolVolume = ethanol.mass / ethanolPureDensity;
		const abv = (100 * ethanolVolume) / volume;
		return abv;
	}

	getIngredientAbv(ingredientId: string): number | -1 {
		const ingredient = this.ingredients.get(ingredientId);
		if (ingredient) {
			return ingredient.item.getAbv();
		}
		for (const ingredient of this.ingredients.values()) {
			if (ingredient.item instanceof Mixture) {
				const abv = ingredient.item.getIngredientAbv(ingredientId);
				if (abv !== -1) return abv;
			}
		}
		return -1;
	}

	getSweetenerSubstances() {
		return [...this.eachSubstance(...Sweeteners.map((s) => s.id))];
	}

	setAbv(targetAbv: number) {
		if (isClose(targetAbv, this.abv, 0.001)) return;
		const working = solver(this, {
			volume: this.volume,
			abv: targetAbv,
			brix: this.brix,
			pH: this.pH,
		});
		for (const { ingredient } of working.eachIngredient()) {
			this.ingredients.get(ingredient.id)!.proportion = ingredient.proportion;
		}
		this.setMass(working.mass);
		return this;
	}
	get proof() {
		return this.abv * 2;
	}

	/**
	 * Approximates the pH of the mixture, considering acids and buffer pairs.
	 *
	 * @returns The pH of the mixture.
	 */
	get pH() {
		let totalMolesH = 0;
		const totalVolume = this.volume;

		// Group acids with their conjugate bases
		const acidGroups = new Map<
			string,
			{
				acid: SubstanceItem;
				conjugateBase?: SubstanceItem;
			}
		>();

		// First pass - find acids
		for (const substance of this.substances) {
			if (substance.item.pKa.length > 0) {
				// Create unique ID for each acid
				acidGroups.set(substance.substanceId, { acid: substance });
			}
		}

		// Second pass - match conjugate bases to acids
		for (const substance of this.substances) {
			const matchingAcids = getConjugateAcids(substance.substanceId);
			// For each acid that matches this base
			for (const acidId of matchingAcids) {
				const group = acidGroups.get(acidId);
				if (group) {
					group.conjugateBase = substance;
				}
			}
		}

		// calculate pH contribution from each acid group
		for (const group of acidGroups.values()) {
			const { acid, conjugateBase } = group;
			const phData = calculatePh({
				acidMolarity: getMolarConcentration(acid.item.substance, acid.mass, totalVolume),
				conjugateBaseMolarity: conjugateBase
					? getMolarConcentration(conjugateBase.item.substance, conjugateBase.mass, totalVolume)
					: 0,
				pKa: acid.item.pKa,
				dissociationFactor: getCitrusDissociationFactor(this.id),
			});
			totalMolesH += phData.H;
		}

		return totalMolesH ? -Math.log10(totalMolesH) : 7;
	}

	density() {
		const totalMass = this.mass;
		const substanceMap = this.makeSubstanceMap();
		let density = 0;
		for (const { mass, item } of substanceMap.values()) {
			const weightPercent = Math.max(0, Math.min(1, mass / totalMass));
			const partialDensity = item.partialSolutionDensity(weightPercent);
			density += partialDensity;
		}
		return density;
	}

	get volume() {
		const mass = this.mass;
		const density = this.density();
		const volume = density !== 0 ? mass / density : 0;
		return volume;
	}

	setVolume(newVolume: number) {
		setVolume(this, newVolume);
		return this;
	}

	getIngredientVolume(ingredientId: string): number | -1 {
		const ingredient = this.ingredients.get(ingredientId);
		if (ingredient) {
			const ingredientMass = this.getIngredientMass(ingredientId);
			const ingredientDensity =
				ingredient.item instanceof SubstanceComponent
					? ingredient.item.pureDensity
					: ingredient.item.density();
			return ingredientMass / ingredientDensity;
		}

		for (const ingredient of this.ingredients.values()) {
			if (ingredient.item instanceof Mixture) {
				const subVolume = ingredient.item.getIngredientVolume(ingredientId);
				if (subVolume !== -1) return subVolume;
			}
		}
		return -1;
	}

	setIngredientVolume(ingredientId: string, newVolume: number) {
		const ingredient = this.ingredients.get(ingredientId);
		if (ingredient) {
			const ingredientDensity =
				ingredient.item instanceof SubstanceComponent
					? ingredient.item.pureDensity
					: ingredient.item.density();
			const newMass = newVolume * ingredientDensity;
			this.setIngredientMass(ingredientId, newMass);
			return true;
		} else {
			for (const ingredient of this.ingredients.values()) {
				if (ingredient.item instanceof Mixture) {
					if (ingredient.item.setIngredientVolume(ingredient.id, newVolume)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	get waterVolume() {
		let waterVolume = 0;
		for (const { item, mass } of this.eachSubstance()) {
			waterVolume += item.getWaterVolume(mass);
		}
		return waterVolume;
	}

	get waterMass() {
		let waterMass = 0;
		for (const { item, mass } of this.eachSubstance()) {
			waterMass += item.getWaterMass(mass);
		}
		return waterMass;
	}
	get alcoholVolume() {
		let alcoholVolume = 0;
		for (const { item, mass } of this.eachSubstance()) {
			alcoholVolume += item.getAlcoholVolume(mass);
		}
		return alcoholVolume;
	}
	get alcoholMass() {
		return this.getAlcoholMass();
	}

	getAlcoholMass() {
		let alcoholMass = 0;
		for (const { mass } of this.eachSubstance('ethanol')) {
			alcoholMass += mass;
		}
		return alcoholMass;
	}

	setAlcoholMass(newAlcoholMass: number) {
		const currentAlcoholMass = this.alcoholMass;
		if (currentAlcoholMass === 0) {
			const spirits = this.eachIngredient()
				.filter(
					({ ingredient }) =>
						isSpirit(ingredient.item) ||
						(ingredient.item instanceof SubstanceComponent &&
							ingredient.item.substanceId === 'ethanol'),
				)
				.map(({ ingredient }) => ingredient);
			for (const spirit of spirits) {
				this.setIngredientMass(spirit.id, newAlcoholMass / spirits.length);
			}
		} else if (!isClose(currentAlcoholMass, newAlcoholMass, 0.001)) {
			const factor = newAlcoholMass / currentAlcoholMass;
			for (const { ingredient, mass } of this.eachIngredient()) {
				if (ingredient.item.getAlcoholMass(mass) > 0) {
					this.setIngredientMass(ingredient.id, mass * factor);
				}
			}
		}
		return this;
	}

	/** get the brix value of the mixture */
	get brix() {
		return this.mass ? (100 * this.equivalentSugarMass) / this.mass : 0;
	}
	setBrix(newBrix: number, maintainVolume = false) {
		if (isClose(newBrix, this.brix)) return;
		// change the ratio of sweetener to total mass
		const working = solver(this, {
			volume: this.volume,
			abv: this.abv,
			brix: newBrix,
			pH: this.pH,
		});
		if (maintainVolume) {
			working.setVolume(this.volume);
		}
		for (const { ingredient } of working.eachIngredient()) {
			this.ingredients.get(ingredient.id)!.proportion = ingredient.proportion;
		}
		this.setMass(working.mass);
		return this;
	}

	getIngredientBrix(ingredientId: string): number | -1 {
		if (this.ingredients.has(ingredientId)) {
			const ingredient = this.ingredients.get(ingredientId)!;
			const mass = this.getIngredientMass(ingredientId);
			return ingredient.item.getEquivalentSugarMass(mass) / mass;
		}
		for (const ingredient of this.ingredients.values()) {
			if (ingredient.item instanceof Mixture) {
				const brix = ingredient.item.getIngredientBrix(ingredientId);
				if (brix !== -1) return brix;
			}
		}
		return -1;
	}

	get equivalentSugarMass() {
		return this.getEquivalentSugarMass();
	}
	getEquivalentSugarMass(_mass?: number) {
		let sugarMass = 0;
		for (const { item: component, mass } of this.eachSubstance()) {
			sugarMass += component.getEquivalentSugarMass(mass);
		}
		return sugarMass;
	}
	setEquivalentSugarMass(newSugarEquivalent: number) {
		const currentSugarEquivalent = this.equivalentSugarMass;
		if (currentSugarEquivalent === 0) {
			const sweeteners = this.eachIngredient()
				.filter(({ ingredient }) => isSweetenerComponent(ingredient.item))
				.map(({ ingredient }) => ingredient);
			for (const sweetener of sweeteners) {
				this.setIngredientMass(sweetener.id, newSugarEquivalent / sweeteners.length);
			}
		} else if (!isClose(currentSugarEquivalent, newSugarEquivalent)) {
			const factor = newSugarEquivalent / currentSugarEquivalent;
			for (const { ingredient, mass } of this.eachIngredient()) {
				if (ingredient.item.getEquivalentSugarMass(mass) > 0) {
					this.setIngredientMass(ingredient.id, mass * factor);
				}
			}
		}
		return this;
	}

	getIngredientMass(ingredientId: string): number | -1 {
		const ingredient = this.ingredients.get(ingredientId);
		if (ingredient) {
			return ingredient.proportion * this.mass;
		}
		for (const ingredient of this.ingredients.values()) {
			if (ingredient.item instanceof Mixture) {
				const subMass = ingredient.item.getIngredientMass(ingredientId);
				if (subMass !== -1) return subMass;
			}
		}
		return -1;
	}

	scaleIngredientMass(ingredientId: string, factor: number) {
		const originalMass = this.getIngredientMass(ingredientId);
		const newMass = originalMass * factor;
		this.setIngredientMass(ingredientId, newMass);
		return this;
	}

	setIngredientMass(ingredientId: string, newMass: number) {
		if (!this.ingredients.has(ingredientId)) {
			throw new Error('Ingredient not found');
		}
		const delta = newMass - this.getIngredientMass(ingredientId);
		const newTotalMass = this.mass + delta;

		for (const { ingredient } of this.eachIngredient()) {
			if (ingredientId === ingredient.id) {
				ingredient.proportion = newMass / newTotalMass;
			} else {
				ingredient.proportion = this.getIngredientMass(ingredient.id) / newTotalMass;
			}
		}
		this.setMass(newTotalMass);
		return this;
	}

	get kcal() {
		let kcal = 0;
		for (const { item: component, mass } of this.eachSubstance()) {
			kcal += component.getKcal(mass);
		}
		return kcal;
	}

	get isValid(): boolean {
		return (
			this.eachSubstance().every((ig) => ig.item.isValid && ig.mass >= 0) &&
			this.eachIngredient().every(
				({ ingredient }) => ingredient.item.isValid && ingredient.proportion >= 0,
			)
		);
	}

	get(
		{ item, id }: { id: string; item: IngredientItemComponent },
		what:
			| 'equivalentSugarMass'
			| 'alcoholMass'
			| 'pH'
			| 'waterVolume'
			| 'mass'
			| 'abv'
			| 'brix'
			| 'volume',
	): number {
		if (item instanceof Mixture) {
			return item[what];
		}
		const itemMass = this.getIngredientMass(id);
		switch (what) {
			case 'equivalentSugarMass':
				return item.getEquivalentSugarMass(itemMass);
			case 'alcoholMass':
				return item.getAlcoholMass(itemMass);
			case 'pH':
				return item.getPH(itemMass);
			case 'waterVolume':
				return item.getWaterVolume(itemMass);
			case 'mass':
				return itemMass;
			case 'abv':
				return item.getAbv();
			case 'brix':
				return item.getBrix();
			case 'volume':
				return item.getVolume(itemMass);
			default:
				what satisfies never;
				throw new Error('Invalid property');
		}
	}
}

export type SubstanceItem = Mixture['substances'][number];

export function toStorageData(mx: Mixture): Pick<StoredFileData, 'mixture' | 'ingredientDb'> {
	return {
		mixture: mx.toStorageData(),
		ingredientDb: mx.toStorageDbData(),
	};
}

export function componentId(): string {
	// return a random string
	return nanoid(12);
}

function isClose(a: number, b: number, delta = 0.01) {
	return Math.abs(a - b) < delta;
}

export function isSpirit(thing: Mixture): boolean;
export function isSpirit(thing: IngredientItemComponent): thing is Mixture;
export function isSpirit(thing: IngredientItemComponent) {
	return (
		thing instanceof Mixture &&
		thing.hasEverySubstances(['ethanol', 'water']) &&
		thing.everySubstance((x) => x.substanceId === 'ethanol' || x.substanceId === 'water')
	);
}

export function isSimpleSpirit(thing: Mixture): boolean;
export function isSimpleSpirit(thing: IngredientItemComponent): thing is Mixture;
export function isSimpleSpirit(thing: IngredientItemComponent) {
	return isSpirit(thing) && thing.ingredients.size === 2 && thing.substances.length === 2;
}

export function isSweetenerMixture(thing: IngredientItemComponent): thing is Mixture {
	return thing instanceof Mixture && thing.everySubstance((x) => isSweetenerId(x.substanceId));
}
export function isSweetenerSubstance(thing: IngredientItemComponent): thing is SubstanceComponent {
	return thing instanceof SubstanceComponent && isSweetenerId(thing.substanceId);
}
export function isSweetenerComponent(thing: IngredientItemComponent) {
	return isSweetenerMixture(thing) || isSweetenerSubstance(thing);
}

export function isSyrup(thing: Mixture): boolean;
export function isSyrup(thing: IngredientItemComponent): thing is Mixture;
export function isSyrup(thing: IngredientItemComponent) {
	return (
		thing instanceof Mixture &&
		thing.hasEverySubstances(['water']) &&
		thing.someSubstance((x) => isSweetenerId(x.substanceId)) &&
		thing.everySubstance((x) => x.substanceId === 'water' || isSweetenerId(x.substanceId))
	);
}

export function isSimpleSyrup(thing: Mixture): boolean;
export function isSimpleSyrup(thing: IngredientItemComponent): thing is Mixture;
export function isSimpleSyrup(thing: IngredientItemComponent) {
	// simple syrup is a mixture of sweetener and water
	return Boolean(isSyrup(thing) && thing.ingredients.size === 2 && thing.substances.length === 2);
}

export function isLiqueur(thing: Mixture): boolean;
export function isLiqueur(thing: IngredientItemComponent): thing is Mixture;
export function isLiqueur(thing: IngredientItemComponent) {
	return thing instanceof Mixture && thing.abv > 0 && thing.brix > 0;
}

export function isWaterSubstance(thing: IngredientItemComponent): thing is SubstanceComponent {
	return thing instanceof SubstanceComponent && thing.substanceId === 'water';
}
export function isWaterMixture(thing: IngredientItemComponent): thing is Mixture {
	return (
		thing instanceof Mixture &&
		thing.hasEverySubstances(['water']) &&
		thing.everySubstance((x) => x.substanceId === 'water')
	);
}
export function isWaterComponent(thing: IngredientItemComponent) {
	return isWaterSubstance(thing) || isWaterMixture(thing);
}
