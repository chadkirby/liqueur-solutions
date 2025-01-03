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
	bufferPairs,
	getConjugateAcid,
	isSweetenerId,
	type SubstanceId,
	Sweeteners,
} from './ingredients/substances.js';
import { calculatePh, getMolarConcentration, type PhInput } from './ph-solver.js';
import { getCitrusDissociationFactor, getIdPrefix } from './citrus-ids.js';

export type MixtureEditKeys = 'brix' | 'abv' | 'volume' | 'mass' | 'pH';

const ethanolPureDensity = SubstanceComponent.ethanol().pureDensity;

export type IngredientItem = {
	id: string;
	proportion: number;
	name: string;
	component: Mixture | SubstanceComponent;
};

export class Mixture implements Component {
	static fromStorageData(mixtureData: MixtureData, ingredientData: IngredientDbData) {
		const ingredients: Array<{
			id: string;
			proportion: number;
			name: string;
			component: SubstanceComponent | Mixture;
		}> = [];

		const db = new Map(ingredientData);
		for (const { id, proportion, name } of mixtureData.ingredients) {
			const data = db.get(id);
			if (!data) {
				throw new Error(`Ingredient ${id} not found in ingredientDb`);
			}
			if (isSubstanceData(data)) {
				ingredients.push({ id, proportion, name, component: new SubstanceComponent(data) });
			} else {
				ingredients.push({
					id,
					proportion,
					name,
					component: Mixture.fromStorageData(data, ingredientData),
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
					component: Mixture | SubstanceComponent;
			  }>
			| Array<{ name: string; mass: number; component: Mixture | SubstanceComponent }> = [],
	) {
		if (ingredients.length && 'mass' in ingredients[0]) {
			ingredients = ingredients as Array<{
				name: string;
				mass: number;
				component: Mixture | SubstanceComponent;
			}>;
			this._mass = ingredients.reduce((acc, { mass }) => acc + mass, 0);
			for (const ingredient of ingredients) {
				this.addInitialIngredient({
					proportion: ingredient.mass / this._mass,
					name: ingredient.name,
					component: ingredient.component,
				});
			}
		} else {
			ingredients = ingredients as Array<{
				proportion: number;
				name: string;
				component: Mixture | SubstanceComponent;
			}>;
			for (const ingredient of ingredients) {
				this.addInitialIngredient(ingredient);
			}
		}
		this.normalizeProportions();
	}

	get id() {
		return this._id;
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
		return [...this.ingredients.values()].flatMap(({ id, component }) => {
			if (component instanceof Mixture) {
				return component.toStorageDbData();
			}
			return [[id, component.toStorageData()]];
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
			component:
				item.component instanceof Mixture ? item.component.clone().updateIds() : item.component,
		};

		if (!ingredient.component?.isValid) {
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
	addIngredient(item: Omit<IngredientItem, 'id' | 'proportion'> & { mass: number }) {
		if (item.mass < 0) {
			throw new Error('Invalid mass');
		}
		const ingredient: IngredientItem = {
			id: componentId(),
			name: item.name,
			component: item.component,
			proportion: this.mass ? item.mass / this.mass : 1,
		};
		this.ingredients.set(ingredient.id, ingredient);
		this._mass += item.mass;
		return this.normalizeProportions();
	}

	removeIngredient(id: string) {
		if (this.ingredients.has(id)) {
			this._mass -= this.getIngredientMass(id);
			this.ingredients.delete(id);
			this.normalizeProportions();
			return true;
		}
		return false;
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

	*eachIngredientId(): Generator<string> {
		for (const id of this.ingredients.keys()) {
			yield id;
		}
	}

	*eachIngredient(
		predicate?: (item: IngredientItem) => boolean,
	): Generator<{ mass: number; ingredient: IngredientItem }> {
		for (const ingredient of this.ingredients.values()) {
			if (!predicate || predicate(ingredient)) {
				yield { ingredient, mass: this.getIngredientMass(ingredient.id) };
			}
		}
	}

	get substances(): { mass: number; substanceId: string; component: SubstanceComponent }[] {
		return [...this.eachSubstance()];
	}

	*eachSubstance(...ids: SubstanceId[]): Generator<{
		mass: number;
		substanceId: string;
		ingredientId: string;
		component: SubstanceComponent;
	}> {
		for (const { ingredient, mass: ingredientMass } of this.eachIngredient()) {
			const component = ingredient.component;
			if (component instanceof SubstanceComponent) {
				if (ids.length === 0 || ids.includes(component.substanceId)) {
					yield {
						substanceId: component.substanceId,
						ingredientId: ingredient.id,
						component,
						mass: ingredientMass,
					};
				}
			} else if (component instanceof Mixture) {
				const subMixture = component;
				for (const subSubstance of subMixture.eachSubstance(...ids)) {
					// the mass of the substance in this mixture is the proportion
					// of the sub-substance in the sub-mixture times the mass of
					// this ingredient
					yield {
						...subSubstance,
						mass: (subSubstance.mass / subMixture.mass) * ingredientMass,
						ingredientId: ingredient.id,
					};
				}
			}
		}
	}

	someSubstance(predicate: (substance: SubstanceComponent) => boolean): boolean {
		for (const substance of this.eachSubstance()) {
			if (predicate(substance.component)) return true;
		}
		return false;
	}

	everySubstance(predicate: (substance: SubstanceComponent) => boolean): boolean {
		for (const substance of this.eachSubstance()) {
			if (!predicate(substance.component)) return false;
		}
		return true;
	}

	hasEverySubstances(substanceIds: SubstanceId[]): boolean {
		const need = new Set(substanceIds);
		const have = new Set<SubstanceId>();
		for (const substance of this.eachSubstance()) {
			if (need.has(substance.component.substanceId)) {
				have.add(substance.component.substanceId);
				if (have.size === need.size) return true;
			}
		}
		return false;
	}
	hasAnySubstances(...substanceIds: SubstanceId[]): boolean {
		for (const substance of this.eachSubstance()) {
			if (substanceIds.includes(substance.component.substanceId)) return true;
		}
		return false;
	}

	describe(): string {
		if (isSyrup(this)) {
			const sweeteners = this.substances
				.filter((x) => Sweeteners.some((s) => s.id === x.substanceId))
				.sort(
					(a, b) =>
						b.component.getEquivalentSugarMass(b.mass) - a.component.getEquivalentSugarMass(a.mass),
				);
			const summary = [
				brixToSyrupProportion(this.brix),
				`${sweeteners.map((s) => s.component.name).join('/')} syrup`,
			];
			return summary.join(' ').replace('sucrose syrup', 'simple syrup');
		}
		if (isSpirit(this)) {
			return `spirit`;
		}
		if (isLiqueur(this)) {
			return `${format(this.proof, { unit: 'proof' })} ${format(this.brix, { unit: 'brix' })} liqueur`;
		}
		return [...this.eachIngredient()]
			.map(({ ingredient }) => ingredient.component.describe())
			.join(', ');
	}

	clone(deep = true): this {
		return new Mixture(
			this.id,
			this.mass,
			[...this.eachIngredient()].map(({ ingredient }) => ({
				...ingredient,
				component:
					deep && ingredient.component instanceof Mixture
						? ingredient.component.clone()
						: ingredient.component,
			})),
		) as this;
	}

	updateIds() {
		this._id = `${getIdPrefix(this.id)}${componentId()}`;
		for (const { ingredient } of this.eachIngredient()) {
			if (ingredient.component instanceof Mixture) {
				ingredient.component.updateIds();
			}
		}
		return this;
	}

	findIngredient(
		predicate: (component: IngredientItem['component']) => boolean,
	): IngredientItem | undefined {
		for (const { ingredient } of this.eachIngredient()) {
			if (predicate(ingredient.component)) return ingredient;
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
			return this.someSubstance((x) => x.substance.pKa.length > 0);
		}
		return false;
	}

	/**
	 * Return a map of substances to their total mass in the mixture.
	 */
	makeSubstanceMap() {
		const substanceMap = new Map<
			SubstanceId,
			{
				mass: number;
				component: SubstanceComponent;
				ingredients: Array<{ ingredientId: string; mass: number }>;
			}
		>();

		for (const substance of this.eachSubstance()) {
			const { substanceId, ingredientId } = substance;
			const mapSubstance = substanceMap.get(substanceId)!;
			if (mapSubstance) {
				mapSubstance.mass += substance.mass;
				mapSubstance.ingredients.push({ ingredientId, mass: substance.mass });
			} else {
				substanceMap.set(substanceId, {
					mass: substance.mass,
					component: SubstanceComponent.new(substanceId),
					ingredients: [{ ingredientId, mass: substance.mass }],
				});
			}
		}
		return substanceMap;
	}

	get abv() {
		const ethanol = this.makeSubstanceMap().get('ethanol');
		if (!ethanol?.mass) return 0;
		const volume = this.volume;
		const ethanolVolume = ethanol.mass / ethanolPureDensity;
		const abv = (100 * ethanolVolume) / volume;
		return abv;
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

		// First pass - find acids and their conjugates
		for (const substance of this.substances) {
			if (substance.component.substance.pKa.length > 0) {
				// This is an acid
				acidGroups.set(substance.substanceId, { acid: substance });
			}
			// Is this a conjugate base for any acid we know about?
			const matchingAcid = getConjugateAcid(substance.substanceId);
			if (matchingAcid) {
				const group = acidGroups.get(matchingAcid);
				if (group) {
					group.conjugateBase = substance;
				}
			}
		}

		// Second pass - calculate pH contribution from each acid group
		for (const group of acidGroups.values()) {
			const { acid, conjugateBase } = group;
			const phData = calculatePh({
				acidMolarity: getMolarConcentration(acid.component.substance, acid.mass, totalVolume),
				conjugateBaseMolarity: conjugateBase
					? getMolarConcentration(
							conjugateBase.component.substance,
							conjugateBase.mass,
							totalVolume,
						)
					: 0,
				pKa: acid.component.substance.pKa,
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
		for (const { mass, component } of substanceMap.values()) {
			const weightPercent = Math.max(0, Math.min(1, mass / totalMass));
			const partialDensity = component.partialSolutionDensity(weightPercent);
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

	get waterVolume() {
		let waterVolume = 0;
		for (const { component, mass } of this.eachSubstance()) {
			waterVolume += component.getWaterVolume(mass);
		}
		return waterVolume;
	}

	get waterMass() {
		let waterMass = 0;
		for (const { component, mass } of this.eachSubstance()) {
			waterMass += component.getWaterMass(mass);
		}
		return waterMass;
	}
	get alcoholVolume() {
		let alcoholVolume = 0;
		for (const { component, mass } of this.eachSubstance()) {
			alcoholVolume += component.getAlcoholVolume(mass);
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
			const spirits = [
				...this.eachIngredient(
					(ig) =>
						isSpirit(ig.component) ||
						(ig.component instanceof SubstanceComponent && ig.component.substanceId === 'ethanol'),
				),
			].map(({ ingredient }) => ingredient);
			for (const spirit of spirits) {
				this.setIngredientMass(spirit.id, newAlcoholMass / spirits.length);
			}
		} else if (!isClose(currentAlcoholMass, newAlcoholMass, 0.001)) {
			const factor = newAlcoholMass / currentAlcoholMass;
			for (const { ingredient, mass } of this.eachIngredient()) {
				if (ingredient.component.getAlcoholMass(mass) > 0) {
					this.setIngredientMass(ingredient.id, mass * factor);
				}
			}
		}
		return this;
	}

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

	get equivalentSugarMass() {
		return this.getEquivalentSugarMass();
	}
	getEquivalentSugarMass(_mass?: number) {
		let sugarMass = 0;
		for (const { component, mass } of this.eachSubstance()) {
			sugarMass += component.getEquivalentSugarMass(mass);
		}
		return sugarMass;
	}
	setEquivalentSugarMass(newSugarEquivalent: number) {
		const currentSugarEquivalent = this.equivalentSugarMass;
		if (currentSugarEquivalent === 0) {
			const sweeteners = [...this.eachIngredient((ig) => isSweetener(ig.component))].map(
				({ ingredient }) => ingredient,
			);
			for (const sweetener of sweeteners) {
				this.setIngredientMass(sweetener.id, newSugarEquivalent / sweeteners.length);
			}
		} else if (!isClose(currentSugarEquivalent, newSugarEquivalent)) {
			const factor = newSugarEquivalent / currentSugarEquivalent;
			for (const { ingredient, mass } of this.eachIngredient()) {
				if (ingredient.component.getEquivalentSugarMass(mass) > 0) {
					this.setIngredientMass(ingredient.id, mass * factor);
				}
			}
		}
		return this;
	}

	getIngredientMass(ingredientId: string) {
		const ingredient = this.ingredients.get(ingredientId);
		return ingredient ? ingredient.proportion * this.mass : 0;
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
		for (const { component, mass } of this.eachSubstance()) {
			kcal += component.getKcal(mass);
		}
		return kcal;
	}

	get isValid(): boolean {
		return (
			[...this.eachSubstance()].every((ig) => ig.component.isValid && ig.mass >= 0) &&
			[...this.eachIngredient()].every(
				({ ingredient }) => ingredient.component.isValid && ingredient.proportion >= 0,
			)
		);
	}

	get(
		item: IngredientItem,
		what: 'equivalentSugarMass' | 'alcoholMass' | 'pH' | 'waterVolume',
	): number {
		const component = item.component;
		if (component instanceof Mixture) {
			return component[what];
		}
		const itemMass = this.getIngredientMass(item.id);
		switch (what) {
			case 'equivalentSugarMass':
				return component.getEquivalentSugarMass(itemMass);
			case 'alcoholMass':
				return component.getAlcoholMass(itemMass);
			case 'pH':
				return component.getPH(itemMass);
			case 'waterVolume':
				return component.getWaterVolume(itemMass);
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
export function isSpirit(thing: IngredientItem['component']): thing is Mixture;
export function isSpirit(thing: IngredientItem['component']) {
	return (
		thing instanceof Mixture &&
		thing.hasEverySubstances(['ethanol', 'water']) &&
		thing.everySubstance((x) => x.substanceId === 'ethanol' || x.substanceId === 'water')
	);
}

export function isSimpleSpirit(thing: Mixture): boolean;
export function isSimpleSpirit(thing: IngredientItem['component']): thing is Mixture;
export function isSimpleSpirit(thing: IngredientItem['component']) {
	return isSpirit(thing) && thing.ingredients.size === 2 && thing.substances.length === 2;
}

export function isSweetener(thing: Mixture): boolean;
export function isSweetener(thing: IngredientItem['component']): thing is Mixture;
export function isSweetener(thing: IngredientItem['component']) {
	if (thing instanceof SubstanceComponent) {
		return isSweetenerId(thing.substanceId);
	}
	if (thing instanceof Mixture) {
		return thing.everySubstance((x) => isSweetenerId(x.substanceId));
	}
	return false;
}

export function isSyrup(thing: Mixture): boolean;
export function isSyrup(thing: IngredientItem['component']): thing is Mixture;
export function isSyrup(thing: IngredientItem['component']) {
	return (
		thing instanceof Mixture &&
		thing.hasEverySubstances(['water']) &&
		thing.someSubstance((x) => isSweetenerId(x.substanceId)) &&
		thing.everySubstance((x) => x.substanceId === 'water' || isSweetenerId(x.substanceId))
	);
}

export function isSimpleSyrup(thing: Mixture): boolean;
export function isSimpleSyrup(thing: IngredientItem['component']): thing is Mixture;
export function isSimpleSyrup(thing: IngredientItem['component']) {
	// simple syrup is a mixture of sweetener and water
	return Boolean(isSyrup(thing) && thing.ingredients.size === 2 && thing.substances.length === 2);
}

export function isLiqueur(thing: Mixture): boolean;
export function isLiqueur(thing: IngredientItem['component']): thing is Mixture;
export function isLiqueur(thing: IngredientItem['component']) {
	return thing instanceof Mixture && thing.abv > 0 && thing.brix > 0;
}

export function isWater(thing: IngredientItem['component']) {
	if (thing instanceof Mixture) {
		return (
			thing.hasEverySubstances(['water']) && thing.everySubstance((x) => x.substanceId === 'water')
		);
	}
	if (thing instanceof SubstanceComponent) {
		return thing.substanceId === 'water';
	}
	return false;
}
