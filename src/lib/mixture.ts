import { SubstanceComponent } from './ingredients/substance-component.js';
import { setVolume, solver } from './solver.js';
import { analyze, brixToSyrupProportion, format, type Analysis } from './utils.js';
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
import {
	isMixtureData,
	isSubstanceData,
	type CommonComponent,
	type DecoratedIngredient,
	type DecoratedSubstance,
	type IngredientDbData,
	type IngredientItem,
	type IngredientItemComponent,
	type IngredientToAdd,
	type MixtureData,
} from './mixture-types.js';

export type MixtureEditKeys = 'brix' | 'abv' | 'volume' | 'mass' | 'pH';

const ethanolPureDensity = SubstanceComponent.new('ethanol').pureDensity;

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

export class Mixture implements CommonComponent {
	static fromStorageData(rootMixtureId: string, ingredientData: IngredientDbData) {
		const ingredients: IngredientItem[] = [];

		const db = new Map(ingredientData);
		const mixtureData = db.get(rootMixtureId);
		if (!mixtureData || !isMixtureData(mixtureData)) {
			throw new Error(`Mixture ${rootMixtureId} not found in ingredientDb`);
		}
		for (const { id, mass, name } of mixtureData.ingredients) {
			const data = db.get(id);
			if (!data) {
				throw new Error(`Ingredient ${id} not found in ingredientDb`);
			}

			const item = isSubstanceData(data)
				? SubstanceComponent.fromStorageData(data)
				: Mixture.fromStorageData(id, ingredientData);

			ingredients.push({
				id,
				mass,
				name,
				item,
			});
		}
		return new Mixture(mixtureData.id, ingredients);
	}

	public readonly ingredients: Map<string, IngredientItem> = new Map();

	constructor(
		private _id = componentId(),
		ingredients: IngredientToAdd[] = [],
	) {
		for (const ingredient of ingredients) {
			this.addIngredient(ingredient);
		}
	}

	clone(deep = true): this {
		const newIngredients = this.eachIngredient().map(({ ingredient }) => ({
			...ingredient,
			item: deep && ingredient.item instanceof Mixture ? ingredient.item.clone() : ingredient.item,
		}));
		return new Mixture(this.id, newIngredients) as this;
	}

	/**
	 * update our data to match another mixture (opposite of clone)
	 */
	updateFrom(other: Mixture) {
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
	private serializeMixtureData(): MixtureData {
		return {
			id: this.id,
			ingredients: [...this.ingredients.values()].map(({ id, mass, name }) => ({
				id,
				mass,
				name,
			})),
		} as const;
	}

	serialize(): IngredientDbData {
		const rootData: [string, MixtureData] = [this.id, this.serializeMixtureData()];
		const ingredientData: IngredientDbData = [...this.ingredients.values()].flatMap(
			({ id, item }) => {
				if (item instanceof Mixture) {
					return [[id, item.serializeMixtureData()], ...item.serialize()];
				}
				if (item instanceof SubstanceComponent) {
					return [[id, item.serializeSubstanceData()]];
				}
				throw new Error('Invalid ingredient');
			},
		);
		return [rootData, ...ingredientData];
	}

	analyze(precision = 0): Analysis {
		return analyze(this, precision);
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
			mass: ingredient.mass,
		};
		this.ingredients.set(ingredientItem.id, ingredientItem);
		return this;
	}

	removeIngredient(id: string) {
		if (this.ingredients.has(id)) {
			this.ingredients.delete(id);
			return true;
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

	get referenceMass() {
		return this.mass;
	}
	get mass() {
		return this.eachIngredient().reduce((acc, { mass }) => acc + mass, 0);
	}

	setMass(newMass: number) {
		if (newMass < 0) {
			throw new Error('Invalid mass');
		}
		const currentMass = this.mass;
		if (currentMass > 0) {
			const factor = newMass / currentMass;
			for (const { ingredient } of this.eachIngredient()) {
				this.scaleIngredientMass(ingredient.id, factor);
			}
		} else {
			// we expect that non-zero masses of the ingredients are encoded as negative
			// numbers, so we'll scale them up to the new mass
			const nonZeroMixtureMass = [...this.ingredients.values()].reduce(
				(acc, { mass }) => acc + Math.abs(mass),
				0,
			);
			for (const { ingredient } of this.eachIngredient()) {
				const nonZeroIngredientMass = Math.abs(ingredient.mass);
				this.setIngredientMass(
					ingredient.id,
					(nonZeroIngredientMass / nonZeroMixtureMass) * newMass,
				);
			}
		}
		return this;
	}

	getIngredientMass(ingredientId: string): number | -1 {
		const ingredient = this.ingredients.get(ingredientId);
		if (ingredient) {
			return ingredient.mass < 0 ? 0 : ingredient.mass;
		}
		return -1;
	}

	scaleIngredientMass(ingredientId: string, factor: number) {
		const originalMass = this.getIngredientMass(ingredientId);
		const newMass = originalMass * factor;
		this.setIngredientMass(ingredientId, newMass);
		return this;
	}

	setIngredientMass(ingredientId: string, newMass: number): boolean {
		if (newMass < 0) {
			throw new Error('Invalid mass');
		}
		const ingredient = this.ingredients.get(ingredientId);
		if (ingredient) {
			// if the new mass is tiny, we'll encode the current mass as
			// negative number so that we can scale it back up later
			ingredient.mass = newMass < 1e-6 ? -1 * Math.abs(ingredient.mass) : newMass;
			return true;
		}
		return false;
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
			this.setIngredientMass(ingredient.id, ingredient.mass);
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
		return -1;
	}

	setIngredientVolume(ingredientId: string, newVolume: number): boolean {
		if (newVolume < 0) {
			throw new Error('Invalid volume');
		}
		const ingredient = this.ingredients.get(ingredientId);
		if (ingredient) {
			const ingredientDensity =
				ingredient.item instanceof SubstanceComponent
					? ingredient.item.pureDensity
					: ingredient.item.density();
			const newMass = newVolume * ingredientDensity;
			this.setIngredientMass(ingredientId, newMass);
			return true;
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
	setBrix(newBrix: number) {
		if (isClose(newBrix, this.brix)) return;
		// change the ratio of sweetener to total mass
		const working = solver(this, {
			volume: this.volume,
			abv: this.abv,
			brix: newBrix,
			pH: this.pH,
		});
		working.setVolume(this.volume);

		for (const { ingredient: workingIdt } of working.eachIngredient()) {
			this.setIngredientMass(workingIdt.id, workingIdt.mass);
		}
		this.setMass(working.mass);
		return this;
	}

	getIngredientBrix(ingredientId: string): number | -1 {
		const ingredient = this.ingredients.get(ingredientId);
		if (ingredient) {
			const mass = this.getIngredientMass(ingredientId);
			return ingredient.item.getEquivalentSugarMass(mass) / mass;
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
				.filter(({ ingredient }) => isSweetener(ingredient.item))
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
				({ ingredient }) => ingredient.item.isValid && ingredient.mass >= 0,
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

export function componentId(): string {
	// return a random string
	return nanoid(12);
}

function isClose(a: number, b: number, delta = 0.01) {
	return Math.abs(a - b) < delta;
}

export function isMixture(thing: IngredientItemComponent): thing is Mixture {
	return thing instanceof Mixture;
}

export function isSubstance(thing: IngredientItemComponent): thing is SubstanceComponent {
	return thing instanceof SubstanceComponent;
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

export function isSimpleSpirit(thing: IngredientItemComponent) {
	return isSpirit(thing) && thing.ingredients.size === 2 && thing.substances.length === 2;
}

export function isSweetenerMixture(thing: IngredientItemComponent) {
	return isMixture(thing) && thing.everySubstance((x) => isSweetenerId(x.substanceId));
}
export function isSweetenerSubstance(thing: IngredientItemComponent) {
	return isSubstance(thing) && isSweetenerId(thing.substanceId);
}
export function isSweetener(thing: IngredientItemComponent) {
	return isSweetenerMixture(thing) || isSweetenerSubstance(thing);
}

export function isSyrup(thing: IngredientItemComponent) {
	return (
		isMixture(thing) &&
		thing.hasEverySubstances(['water']) &&
		thing.someSubstance((x) => isSweetenerId(x.substanceId)) &&
		thing.everySubstance((x) => x.substanceId === 'water' || isSweetenerId(x.substanceId))
	);
}

export function isSimpleSyrup(thing: IngredientItemComponent) {
	// simple syrup is a mixture of sweetener and water
	return Boolean(
		isMixture(thing) &&
			isSyrup(thing) &&
			thing.ingredients.size === 2 &&
			thing.substances.length === 2,
	);
}

export function isLiqueur(thing: IngredientItemComponent) {
	return isMixture(thing) && thing.abv > 0 && thing.brix > 0;
}

export function isWaterSubstance(thing: IngredientItemComponent): thing is SubstanceComponent {
	return isSubstance(thing) && thing.substanceId === 'water';
}
export function isWaterMixture(thing: IngredientItemComponent): thing is Mixture {
	return (
		isMixture(thing) &&
		thing.hasEverySubstances(['water']) &&
		thing.everySubstance((x) => x.substanceId === 'water')
	);
}
export function isWater(thing: IngredientItemComponent) {
	return isWaterSubstance(thing) || isWaterMixture(thing);
}
