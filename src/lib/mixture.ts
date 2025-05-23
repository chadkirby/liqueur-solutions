import { customAlphabet, urlAlphabet } from 'nanoid';
import { SubstanceComponent } from './ingredients/substance-component.js';
import { solveMassForVolume, solver } from './solver.js';
import { brixToSyrupProportion, capitalize, format, round } from './utils.js';
import {
	isAcidId,
	isSaltId,
	isSweetenerId,
	type SubstanceId,
	sweetenerIds,
	Sweeteners,
} from './ingredients/substances.js';
import { getMixturePh } from './ph-solver.js';
import {
	citrusJuiceNames,
	getCitrusPrefix,
	getIdPrefix,
	type PrefixedId,
} from './ingredients/citrus-ids.js';
import { FancyIterator } from './iterator.js';
import {
	isMixtureData,
	isSubstanceData,
	type CommonComponent,
	type DecoratedIngredient,
	type DecoratedSubstance,
	type EditableProperty,
	type IngredientItem,
	type IngredientItemComponent,
	type IngredientSubstanceItem,
	type IngredientToAdd,
	type MixtureAnalysis,
	type MixtureData,
} from './mixture-types.js';
import { getIngredientHash, type IngredientDbData } from './data-format.js';

export type MixtureEditKeys = 'brix' | 'abv' | 'volume' | 'mass' | 'pH';

const ethanolPureDensity = SubstanceComponent.new('ethanol').pureDensity;

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
	static deserialize(rootMixtureId: string, ingredientData: IngredientDbData) {
		const ingredients: IngredientItem[] = [];

		const db = new Map(ingredientData);
		const mixtureData = db.get(rootMixtureId);
		if (!mixtureData || !isMixtureData(mixtureData)) {
			throw new Error(`Mixture ${rootMixtureId} not found in ingredientDb`);
		}
		for (const { id, mass, name, notes } of mixtureData.ingredients) {
			const data = db.get(id);
			if (!data) {
				throw new Error(`Ingredient ${id} not found in ingredientDb`);
			}

			const item = isSubstanceData(data)
				? SubstanceComponent.fromStorageData(data)
				: Mixture.deserialize(id, ingredientData);

			ingredients.push({
				id,
				mass,
				name,
				item,
				notes,
			});
		}
		return new Mixture(mixtureData.id, ingredients);
	}

	constructor(
		private _id = componentId(),
		ingredients: IngredientToAdd[] = [],
	) {
		if (!_id) {
			throw new Error('Invalid id');
		}
		for (const ingredient of ingredients) {
			this.addIngredient(ingredient);
		}
	}

	private readonly ingredientList: Array<IngredientItem> = [];
	get ingredients() {
		return new Map(this.ingredientList.map((i) => [i.id, i])) as ReadonlyMap<
			string,
			Readonly<IngredientItem>
		>;
	}

	get size() {
		return this.ingredientList.length;
	}

	getIngredientHash(name: string) {
		return getIngredientHash({ name, desc: this.describe(), ingredientDb: this.serialize() });
	}

	getIngredient(id: string) {
		return this.ingredientList.find((i) => i.id === id);
	}

	clone(): this {
		const data = this.serialize();
		return Mixture.deserialize(data[0][0], data) as this;
	}

	/**
	 * update our data to match another mixture (opposite of clone)
	 */
	updateFrom(other: Mixture) {
		// get the other ingredients before we empty out the list so that
		// nothing bad happens if we end up updating from the same mixture.
		const otherIngredientList = [...other.eachIngredient()];
		// empty the ingredient list
		this.ingredientList.splice(0, this.ingredientList.length);
		for (const { ingredient } of otherIngredientList) {
			const newIngredient = {
				...ingredient,
				item: ingredient.item.clone(),
			};
			this.ingredientList.push(newIngredient);
		}
		return this;
	}

	/**
	 * Get data in a format compatible with storage (ReadonlyJSONValue)
	 */
	private serializeMixtureData(): MixtureData {
		return {
			id: this.id,
			ingredients: this.ingredientList.map(({ id, mass, name, notes }) => ({
				id,
				mass,
				name,
				notes,
			})),
		} as const;
	}

	serialize(): IngredientDbData {
		const rootData: [string, MixtureData] = [this.id, this.serializeMixtureData()];
		const ingredientData: IngredientDbData = this.ingredientList.flatMap(({ id, item }) => {
			if (item instanceof Mixture) {
				return [[id, item.serializeMixtureData()], ...item.serialize()];
			}
			if (item instanceof SubstanceComponent) {
				return [[id, item.serializeSubstanceData()]];
			}
			throw new Error('Invalid ingredient');
		});
		return [rootData, ...ingredientData];
	}

	analyze(precision = 0): MixtureAnalysis {
		return {
			volume: round(this.volume, precision),
			mass: round(this.mass, precision),
			abv: round(this.abv, precision),
			brix: round(this.brix, precision),
			kcal: round(this.kcal, precision),
			proof: round(this.abv * 2, precision),
			equivalentSugarMass: round(this.equivalentSugarMass, precision),
			pH: round(this.pH, precision),
		};
	}

	analyzeIngredient(ingredientId: string, precision = 0): MixtureAnalysis {
		const ingredient = this.getIngredient(ingredientId);
		if (!ingredient) {
			throw new Error('Invalid ingredient');
		}
		const mass = this.getIngredientMass(ingredientId);
		const volume = this.getIngredientVolume(ingredientId);
		const abv = this.getIngredientAbv(ingredientId);
		const brix = this.getIngredientBrix(ingredientId);
		const kcal = ingredient.item.getKcal(mass);
		const equivalentSugarMass = ingredient.item.getEquivalentSugarMass(mass);
		return {
			volume: round(volume, precision),
			mass: round(mass, precision),
			abv: round(abv, precision),
			brix: round(brix, precision),
			kcal: round(kcal, precision),
			proof: round(abv * 2, precision),
			equivalentSugarMass: round(equivalentSugarMass, precision),
			pH: isMixture(ingredient.item) ? round(ingredient.item.getPH(), precision) : NaN,
		};
	}
	/**
	 * Add a quantity of an ingredient to the mixture and recompute
	 * proportions.
	 */
	addIngredient(ingredient: IngredientToAdd) {
		const id = isMixture(ingredient.item)
			? ingredient.item.id
			: ingredient.id
				? ingredient.id
				: componentId();
		const ingredientItem: IngredientItem = {
			id,
			name: ingredient.name,
			item: ingredient.item,
			mass: ingredient.mass,
			notes: ingredient.notes,
		};
		this.ingredientList.push(ingredientItem);
		return this;
	}

	removeIngredient(id: string) {
		const index = this.ingredientList.findIndex((i) => i.id === id);
		if (index > -1) {
			this.ingredientList.splice(index, 1);
			return true;
		}
		return false;
	}

	/**
	 * replace an ingredient with a new one (in the same position in the
	 * ingredients list)
	 */
	replaceIngredient(id: string, ingredient: IngredientToAdd) {
		const index = this.ingredientList.findIndex((x) => x.id === id);
		if (index === -1) {
			return false;
		}
		const newId = isMixture(ingredient.item)
			? ingredient.item.id
			: ingredient.id
				? ingredient.id
				: componentId();
		const newIngredient = {
			id: newId,
			name: ingredient.name,
			item: ingredient.item,
			mass: ingredient.mass,
			notes: ingredient.notes,
		};
		this.ingredientList.splice(index, 1, newIngredient);

		return true;
	}

	replaceIngredientComponent(id: string, item: IngredientItemComponent) {
		const ingredient = this.getIngredient(id)!;
		if (ingredient) {
			ingredient.item = item;
			return true;
		}
		for (const ingredient of this.ingredientList) {
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

	private _setMass(newMass: number) {
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
			const nonZeroMixtureMass = this.ingredientList.reduce(
				(acc, { mass }) => acc + Math.abs(mass),
				0,
			);
			for (const { ingredient } of this.eachIngredient()) {
				const nonZeroIngredientMass = Math.abs(ingredient.mass);
				this.setIngredientMass(
					(nonZeroIngredientMass / nonZeroMixtureMass) * newMass,
					ingredient.id,
				);
			}
		}
		return this;
	}

	getIngredientMass(ingredientId: string): number | -1 {
		if (ingredientId === this.id) {
			return this.mass;
		}
		const ingredient = this.getIngredient(ingredientId);
		if (ingredient) {
			return ingredient.mass < 0 ? 0 : ingredient.mass;
		}
		return -1;
	}

	scaleIngredientMass(ingredientId: string, factor: number) {
		const originalMass = this.getIngredientMass(ingredientId);
		const newMass = originalMass * factor;
		this.setIngredientMass(newMass, ingredientId);
		return this;
	}

	setIngredientMass(newMass: number, ingredientId = this.id): boolean {
		if (newMass < 0) {
			throw new Error('Invalid mass');
		}
		if (ingredientId === this.id) {
			return this._setMass(newMass) === this;
		}
		const ingredient = this.getIngredient(ingredientId);
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
		return this.ingredientList.map((i) => i.id);
	}

	eachIngredient() {
		function* eachIngredient(this: Mixture): Generator<DecoratedIngredient> {
			for (const ingredient of this.ingredientList) {
				yield { ingredient, mass: this.getIngredientMass(ingredient.id) };
			}
		}

		return new FancyIterator(eachIngredient.apply(this));
	}

	get substances(): DecoratedSubstance[] {
		return [...this.eachSubstance()];
	}

	eachSubstance() {
		return new FancyIterator(this._eachSubstance());
	}

	private *_eachSubstance(): Generator<DecoratedSubstance> {
		for (const { ingredient, mass: ingredientMass } of this.eachIngredient()) {
			const item = ingredient.item;
			if (item instanceof SubstanceComponent) {
				yield {
					substanceId: item.substanceId,
					ingredientId: ingredient.id,
					mixtureId: this.id,
					item: item,
					mass: ingredientMass,
				};
			} else if (item instanceof Mixture) {
				const subMixture = item;
				for (const subSubstance of subMixture._eachSubstance()) {
					// the mass of the substance in this mixture is the proportion
					// of the sub-substance in the sub-mixture times the mass of
					// this ingredient
					yield {
						substanceId: subSubstance.substanceId,
						item: subSubstance.item,
						mass: (subSubstance.mass / subMixture.mass) * ingredientMass,
						ingredientId: ingredient.id,
						mixtureId: subMixture.id,
					};
				}
			}
		}
	}

	describe(): string {
		if (isEmptyMixture(this)) {
			return 'Empty Mixture';
		}
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
			return `Spirit`;
		}
		if (isLiqueur(this)) {
			return `${format(this.proof, { unit: 'proof' })} ${format(this.brix, { unit: 'brix' })} liqueur`;
		}
		if (isCitrusMixture(this)) {
			const type = getCitrusPrefix(this.id);
			const name = citrusJuiceNames.find((n) => type?.includes(n)) ?? 'citrus';
			return `${capitalize(name)} juice`;
		}
		return this.eachIngredient()
			.map(({ ingredient }) => ingredient.item.describe())
			.join(', ');
	}

	updateIds() {
		this._id = `${getIdPrefix(this.id) ?? ''}${componentId()}`;
		for (const { ingredient } of this.eachIngredient()) {
			if (ingredient.item instanceof Mixture) {
				ingredient.item.updateIds();
			}
		}
		return this;
	}

	findIngredient(
		predicate: (item: IngredientItemComponent, i: number) => boolean,
	): IngredientItem | undefined {
		let i = 0;
		for (const { ingredient } of this.eachIngredient()) {
			if (predicate(ingredient.item, i++)) return ingredient;
		}
		return undefined;
	}

	canEdit(key: EditableProperty): boolean {
		switch (key) {
			case 'brix':
				return this.eachSubstance().some((s) => sweetenerIds.includes(s.substanceId as any));
			case 'abv':
				return this.eachSubstance().some((s) => s.substanceId === 'ethanol');
			case 'volume':
			case 'mass':
				return true;
			case 'pH':
				return this.eachSubstance().some((x) => x.item.pKa.length > 0);
			default:
				key satisfies never;
				return false;
		}
	}

	/**
	 * Return a map of substances to their total mass in the mixture.
	 */
	makeSubstanceMap(sorted = false): Map<SubstanceId, MappedSubstance> {
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
		return sorted
			? new Map([...substanceMap.entries()].sort(([, a], [, b]) => b.mass - a.mass))
			: substanceMap;
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
		const ingredient = this.getIngredient(ingredientId);
		if (ingredient) {
			return ingredient.item.getAbv();
		}
		return -1;
	}

	setAbv(targetAbv: number) {
		if (isClose(targetAbv, this.abv, 0.001)) return;
		const working = solver(this, {
			volume: this.volume,
			abv: targetAbv,
			brix: this.brix,
			pH: this.pH,
		});
		return this.updateFrom(working);
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
		return this.getPH();
	}
	getPH() {
		return getMixturePh(this.volume, this.substances).pH;
	}

	setPH(newPH: number) {
		if (isClose(newPH, this.getPH(), 0.001)) return;
		const working = solver(this, {
			volume: this.volume,
			abv: this.abv,
			brix: this.brix,
			pH: newPH,
		});
		return this.updateFrom(working);
	}

	getDensity() {
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
		return this.getVolume();
	}
	getVolume() {
		const density = this.getDensity();
		const volume = density !== 0 ? this.mass / density : 0;
		return volume;
	}

	setVolume(newVolume: number) {
		if (newVolume < 0) {
			throw new Error('Invalid volume');
		}
		if (newVolume === 0) {
			this.setIngredientMass(0);
			return this;
		}
		const newMass = solveMassForVolume(this, newVolume);
		if (newMass < 0) {
			throw new Error('Invalid volume');
		}
		if (this.setIngredientMass(newMass)) {
			return this;
		}
		throw new Error("Can't set volume");
	}

	getIngredientVolume(ingredientId: string): number | -1 {
		const ingredient = this.getIngredient(ingredientId);
		if (ingredient && isSubstance(ingredient.item)) {
			const ingredientMass = this.getIngredientMass(ingredientId);
			const density = ingredient.item.pureDensity;
			return density === 0 ? 0 : ingredientMass / density;
		}
		if (ingredient && isMixture(ingredient.item)) {
			const ingredientMass = this.getIngredientMass(ingredientId);
			const density = ingredient.item.getDensity();
			return density === 0 ? 0 : ingredientMass / density;
		}
		return -1;
	}

	setIngredientVolume(ingredientId: string, newVolume: number): boolean {
		if (newVolume < 0) {
			throw new Error('Invalid volume');
		}
		const ingredient = this.getIngredient(ingredientId);
		if (isSubstance(ingredient?.item)) {
			const ingredientDensity = ingredient.item.pureDensity;
			const newMass = newVolume * ingredientDensity;
			this.setIngredientMass(newMass, ingredientId);
			return true;
		}
		if (isMixture(ingredient?.item)) {
			// set the volume of the sub-mixture to the new volume, handling
			// cases where the sub-mixture is an ethanol solution
			const newMass = solveMassForVolume(ingredient.item, newVolume);
			if (newMass < 0) {
				throw new Error("Can't set ingredient volume");
			}
			this.setIngredientMass(newMass, ingredientId);
			return true;
		}
		return false;
	}

	getWaterVolume(targetMass?: number): number {
		const factor = targetMass ? targetMass / this.mass : 1;
		let waterVolume = 0;
		for (const { item, mass } of this.eachSubstance()) {
			waterVolume += item.getWaterVolume(mass * factor);
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
	getAlcoholVolume(targetMass?: number): number {
		const ethMass = this.getAlcoholMass(targetMass);
		return ethMass / ethanolPureDensity;
	}

	getAlcoholMass(targetMass?: number): number {
		const factor = targetMass ? targetMass / this.mass : 1;
		let alcoholMass = 0;
		for (const { mass } of this.eachSubstance().filter((s) => s.substanceId === 'ethanol')) {
			alcoholMass += mass * factor;
		}
		return alcoholMass;
	}

	setAlcoholMass(newAlcoholMass: number) {
		const currentAlcoholMass = this.getAlcoholMass();
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
				this.setIngredientMass(newAlcoholMass / spirits.length, spirit.id);
			}
		} else if (!isClose(currentAlcoholMass, newAlcoholMass, 0.001)) {
			const factor = newAlcoholMass / currentAlcoholMass;
			for (const { ingredient, mass } of this.eachIngredient()) {
				if (ingredient.item.getAlcoholMass(mass) > 0) {
					this.setIngredientMass(mass * factor, ingredient.id);
				}
			}
		}
		return this;
	}

	/** get the brix value of the mixture */
	get brix() {
		return this.getBrix();
	}
	getBrix() {
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
		return this.updateFrom(working);
	}

	getIngredientBrix(ingredientId: string): number | -1 {
		const ingredient = this.getIngredient(ingredientId);
		if (isMixture(ingredient?.item)) {
			return ingredient.item.brix;
		}
		if (ingredient) {
			const mass = this.getIngredientMass(ingredientId);
			return (100 * ingredient.item.getEquivalentSugarMass(mass)) / mass;
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
				this.setIngredientMass(newSugarEquivalent / sweeteners.length, sweetener.id);
			}
		} else if (!isClose(currentSugarEquivalent, newSugarEquivalent)) {
			const factor = newSugarEquivalent / currentSugarEquivalent;
			for (const { ingredient, mass } of this.eachIngredient()) {
				if (ingredient.item.getEquivalentSugarMass(mass) > 0) {
					this.setIngredientMass(mass * factor, ingredient.id);
				}
			}
		}
		return this;
	}

	get kcal() {
		return this.getKcal();
	}
	getKcal(targetMass?: number) {
		const factor = targetMass ? targetMass / this.mass : 1;
		let kcal = 0;
		for (const { item: component, mass } of this.eachSubstance()) {
			kcal += component.getKcal(mass * factor);
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
}

export type SubstanceItem = Mixture['substances'][number];

const nanoid = customAlphabet(urlAlphabet, 8);
export function componentId(): string {
	// return a random string
	return nanoid();
}

function isClose(a: number, b: number, delta = 0.01) {
	return Math.abs(a - b) < delta;
}

export function isMixture(thing: unknown): thing is Mixture {
	return thing instanceof Mixture;
}

export function isSubstance(thing: unknown): thing is SubstanceComponent {
	return thing instanceof SubstanceComponent;
}

export function isSpirit(thing: Mixture): boolean;
export function isSpirit(thing: IngredientItemComponent): thing is Mixture;
export function isSpirit(thing: IngredientItemComponent) {
	return (
		thing instanceof Mixture &&
		thing.size > 0 &&
		thing
			.eachSubstance()
			.every((x, i) => (i < 2 && x.substanceId === 'ethanol') || x.substanceId === 'water')
	);
}

export function isSimpleSpirit(thing: IngredientItemComponent) {
	return isSpirit(thing) && thing.ingredients.size === 2 && thing.substances.length === 2;
}

export function isSweetenerMixture(thing: IngredientItemComponent) {
	return (
		isMixture(thing) &&
		thing.size > 0 &&
		thing.eachSubstance().every((x) => isSweetenerId(x.substanceId))
	);
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
		thing.eachSubstance().some((x) => x.item.substanceId === 'water') &&
		thing.eachSubstance().some((x) => isSweetenerId(x.substanceId)) &&
		thing.eachSubstance().every((x) => x.substanceId === 'water' || isSweetenerId(x.substanceId))
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
		thing.size > 0 &&
		thing.eachSubstance().every((x) => x.substanceId === 'water')
	);
}
export function isWater(thing: IngredientItemComponent) {
	return isWaterSubstance(thing) || isWaterMixture(thing);
}

export function isAcidSubstance(thing: IngredientItemComponent) {
	return isSubstance(thing) && isAcidId(thing.substanceId);
}
export function isAcidicMixture(thing: IngredientItemComponent) {
	return isMixture(thing) && thing.eachSubstance().some((x) => x.item.pKa.length > 0);
}

export function isSaltIngredient(thing: IngredientItem): thing is IngredientSubstanceItem {
	return isSaltSubstance(thing.item);
}
export function isSaltSubstance(thing: IngredientItemComponent): thing is SubstanceComponent {
	return isSubstance(thing) && isSaltId(thing.substanceId);
}

export function isCitrusMixture(mx: unknown): mx is Mixture & { id: PrefixedId } {
	return isMixture(mx) && getCitrusPrefix(mx.id) !== null;
}

export function isEmptyMixture(mx: Mixture): boolean {
	return mx.mass === 0;
}
