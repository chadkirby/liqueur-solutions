import { SubstanceComponent, isSubstanceData } from './ingredients/index.js';
import { type Component } from './ingredients/index.js';
import { setVolume, solver } from './solver.js';
import { analyze, brixToSyrupProportion, format, type Analysis } from './utils.js';
import type { IngredientDbData, MixtureData, StoredFileData } from './ingredients/index.js';
import { nanoid } from 'nanoid';
import {
	isSolventId,
	isSweetenerId,
	type SubstanceId,
	Sweeteners
} from './ingredients/substances.js';

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
					component: Mixture.fromStorageData(data, ingredientData)
				});
			}
		}
		return new Mixture(mixtureData.id, mixtureData.mass, ingredients);
	}

	public readonly ingredients: Map<string, IngredientItem> = new Map();

	constructor(
		private _id = componentId(),
		private _mass: number = 1,
		ingredients:
			| Array<{
					proportion: number;
					name: string;
					component: Mixture | SubstanceComponent;
			  }>
			| Array<{ name: string; mass: number; component: Mixture | SubstanceComponent }> = []
	) {
		if ('mass' in ingredients[0]) {
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
					component: ingredient.component
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
				name
			}))
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
				item.component instanceof Mixture ? item.component.clone().updateIds() : item.component
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
			0
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
			proportion: item.mass / this.mass
		};
		this.ingredients.set(ingredient.id, ingredient);
		this._mass += item.mass;
		return this.normalizeProportions();
	}

	removeIngredient(id: string) {
		// TODO: recompute proportions
		if (this.ingredients.has(id)) {
			this.ingredients.delete(id);
			return true;
		}

		// Not sure we actually ever want to remove sub-ingredients...
		// for (const { component } of this.eachIngredient()) {
		// 	if (component instanceof Mixture) {
		// 		if (component.removeIngredient(id)) return true;
		// 	}
		// }

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

	*eachIngredient(predicate?: (item: IngredientItem) => boolean): Generator<IngredientItem> {
		for (const ingredient of this.ingredients.values()) {
			if (!predicate || predicate(ingredient)) {
				yield ingredient;
			}
		}
	}

	get substances(): { mass: number; substanceId: string; component: SubstanceComponent }[] {
		return [...this.eachSubstance()];
	}

	*eachSubstance(...ids: SubstanceId[]): Generator<{
		mass: number;
		substanceId: string;
		component: SubstanceComponent;
	}> {
		const mass = this.mass;
		for (const { component, proportion } of this.eachIngredient()) {
			if (component instanceof SubstanceComponent) {
				if (ids.length === 0 || ids.includes(component.substanceId)) {
					yield { substanceId: component.substanceId, component, mass: mass * proportion };
				}
			} else if (component instanceof Mixture) {
				yield * component.setMass(mass * proportion).eachSubstance(...ids);
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
						b.component.getEquivalentSugarMass(b.mass) - a.component.getEquivalentSugarMass(a.mass)
				);
			const summary = [
				brixToSyrupProportion(this.brix),
				`${sweeteners.map((s) => s.component.name).join('/')} syrup`
			];
			return summary.join(' ').replace('sucrose syrup', 'simple syrup');
		}
		if (isSpirit(this)) {
			return `spirit`;
		}
		if (isLiqueur(this)) {
			return `${format(this.proof, { unit: 'proof' })} ${format(this.brix, { unit: 'brix' })} liqueur`;
		}
		return [...this.eachIngredient()].map((ig) => ig.component.describe()).join(', ');
	}

	clone(): this {
		return new Mixture(
			this.id,
			this.mass,
			[...this.eachIngredient()].map((ig) => ({
				...ig,
				component: ig.component instanceof Mixture ? ig.component.clone() : ig.component
			}))
		) as this;
	}

	updateIds() {
		this._id = componentId();
		for (const { component } of this.eachIngredient()) {
			if (component instanceof Mixture) {
				component.updateIds();
			}
		}
		return this;
	}

	findIngredient(predicate: (component: Component) => boolean): Component | undefined {
		for (const { component } of this.eachIngredient()) {
			if (predicate(component)) return component;
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
		const substanceMap = new Map<SubstanceId, { mass: number; component: SubstanceComponent }>();

		for (const substance of this.eachSubstance()) {
			const { substanceId } = substance;
			const mapSubstance = substanceMap.get(substanceId)!;
			if (mapSubstance) {
				mapSubstance.mass += substance.mass;
			} else {
				substanceMap.set(substanceId, {
					mass: substance.mass,
					component: SubstanceComponent.new(substanceId)
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

	setAbv(targetAbv: number, maintainVolume = false) {
		if (targetAbv === this.abv) return;
		const originalVolume = maintainVolume ? this.volume : null;
		const working = solver(this, {
			abv: targetAbv,
			brix: this.brix,
			pH: this.pH
		});
		for (const [key, ingredient] of working.ingredients.entries()) {
			this.ingredients.get(key)!.proportion = ingredient.proportion;
		}
		if (originalVolume !== null) {
			this.setVolume(originalVolume);
		}
	}

	get pH() {
		// Track total H+ ions (in moles) and total volume (in mL)
		let totalMolesH = 0;
		let totalVolume = 0;

		// Iterate through each substance in the mixture
		for (const substance of this.eachSubstance()) {
			const substanceVolume = substance.component.getVolume(substance.mass);
			const substanceMolarity = substance.component.getMolarity(substance.mass);
			const acidDisociationK = substance.component.substance.pKa;

			totalVolume += substanceVolume;

			// Skip substances that aren't acids (no pKa values)
			if (acidDisociationK.length === 0) continue;

			// Convert substance amount to moles
			// molarity (mol/L) * volume (mL) / 1000 = moles
			const molesOfSubstance = (substanceMolarity * substanceVolume) / 1000;

			// For polyprotic acids, calculate H+ contribution from each dissociation step
			for (const [i, pKa] of acidDisociationK.entries()) {
				// Ka (acid dissociation constant) = 10^-pKa
				const Ka = Math.pow(10, -pKa);

				// Weight later dissociations less since they contribute less to total [H+]
				// First dissociation (i=0): weight = 1
				// Second dissociation (i=1): weight = 1/2
				// Third dissociation (i=2): weight = 1/3
				const weight = 1 / (i + 1);

				// Calculate H+ contribution using simplified equilibrium approximation
				// √(Ka * [acid]) gives approximate [H+] for each dissociation
				// Multiply by moles of substance to get moles of H+
				totalMolesH += weight * Math.sqrt(Ka * molesOfSubstance);
			}
		}

		// If no acids present (totalMolesH = 0), return neutral pH
		if (!totalMolesH) return 7;

		// Convert total moles H+ back to molarity by dividing by total volume in liters
		const finalMolarity = totalMolesH / (totalVolume / 1000);

		// Convert H+ concentration to pH using -log10[H+]
		return -Math.log10(finalMolarity);
	}

	density() {
		const totalMass = this.mass;
		const substanceMap = this.makeSubstanceMap();
		let density = 0;
		for (const { mass, component } of substanceMap.values()) {
			const weightPercent = mass / totalMass;
			const partialDensity = component.partialSolutionDensity(weightPercent);
			density += partialDensity;
		}
		return density;
	}

	get proof() {
		return this.abv * 2;
	}

	get volume() {
		const density = this.density();
		const volume = this.mass / density;
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

	get brix() {
		return (100 * this.equivalentSugarMass) / this.mass;
	}
	setBrix(newBrix: number, maintainVolume = false) {
		if (isClose(newBrix, this.brix)) return;
		// change the ratio of sweetener to total mass
		const working = solver(this, {
			abv: this.abv,
			brix: newBrix,
			pH: this.pH
		});
		if (maintainVolume) {
			working.setVolume(this.volume);
		}
		for (const ingredient of working.eachIngredient()) {
			this.ingredients.get(ingredient.id)!.proportion = ingredient.proportion;
		}
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
		if (!isClose(currentSugarEquivalent, newSugarEquivalent)) {
			const factor = newSugarEquivalent / currentSugarEquivalent;
			for (const ingredient of this.eachIngredient()) {
				if (
					ingredient.component.getEquivalentSugarMass(this.getIngredientMass(ingredient.id)) > 0
				) {
					const originalMass = this.getIngredientMass(ingredient.id);
					this.setIngredientMass(ingredient.id, originalMass * factor);
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
		const oldTotalMass = this.mass;
		const delta = newMass - this.getIngredientMass(ingredientId);
		const newTotalMass = oldTotalMass + delta;

		for (const ingredient of this.eachIngredient()) {
			if (ingredientId === ingredient.id) {
				ingredient.proportion = newMass / newTotalMass;
			} else {
				const oldMass = ingredient.proportion * oldTotalMass;
				ingredient.proportion = oldMass / oldTotalMass;
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
			[...this.eachIngredient()].every((ig) => ig.component.isValid && ig.proportion >= 0)
		);
	}

	get(
		item: IngredientItem,
		what: 'equivalentSugarMass' | 'alcoholMass' | 'pH' | 'waterVolume'
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

export function toStorageData(mx: Mixture): Pick<StoredFileData, 'mixture' | 'ingredientDb'> {
	return {
		mixture: mx.toStorageData(),
		ingredientDb: mx.toStorageDbData()
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

export function isWater(thing: Mixture): boolean;
export function isWater(thing: IngredientItem['component']): thing is Mixture;
export function isWater(thing: IngredientItem['component']) {
	return (
		thing instanceof Mixture &&
		thing.hasEverySubstances(['water']) &&
		thing.everySubstance((x) => x.substanceId === 'water')
	);
}
