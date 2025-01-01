import { analyze, type Analysis } from '../utils.js';
import {
	Sweeteners,
	Substances,
	type SubstanceId,
	type Substance,
	SubstanceIds,
	interpolator,
} from './substances.js';

const NumericDataValueKeys = ['abv', 'brix', 'volume', 'mass'] as const;
export type ComponentValueKeys = (typeof NumericDataValueKeys)[number];

export function isNumericDataValueKey(key: string): key is ComponentValueKeys {
	return NumericDataValueKeys.includes(key as ComponentValueKeys);
}

export const SweetenerTypes = Sweeteners.map(({ id }) => id);
export type SweetenerTypes = (typeof SweetenerTypes)[number];

const componentTypes = ['substance', 'mixture'] as const;
export type ComponentTypes = (typeof componentTypes)[number];

export interface Data {
	readonly type: ComponentTypes;
}
export type MixtureData = {
	id: string;
	mass: number;
	ingredients: Array<{ id: string; proportion: number; name: string }>;
};

export type SubstanceData = {
	id: SubstanceId;
};

export type IngredientData = MixtureData | SubstanceData;

// serialized Map<string, IngredientData>
export type IngredientDbData = Array<[string, IngredientData]>;

/**
 * FileItem represents a stored mixture file. All types must be
 * compatible with Replicache's ReadonlyJSONValue.
 */
export type StoredFileData = {
	id: string;
	name: string;
	accessTime: number;
	desc: string;
	mixture: MixtureData;
	ingredientDb: IngredientDbData;
};

export function isMixtureData(data: IngredientData): data is MixtureData {
	return 'ingredients' in data;
}

export function isSubstanceData(data: IngredientData): data is SubstanceData {
	return !isMixtureData(data);
}

export function isComponentType(type: string): type is ComponentTypes {
	return componentTypes.includes(type as ComponentTypes);
}

export interface Component {
	describe(): string;
	toStorageData(): IngredientData;

	readonly isValid: boolean;

	label: string;
}

export class SubstanceComponent implements Component {
	static water() {
		return new SubstanceComponent({ id: 'water' });
	}
	static ethanol() {
		return new SubstanceComponent({ id: 'ethanol' });
	}
	static sucrose() {
		return new SubstanceComponent({ id: 'sucrose' });
	}
	static new(substanceId: SubstanceId) {
		return new SubstanceComponent({ id: substanceId });
	}

	readonly substance: Substance;
	constructor(readonly data: SubstanceData) {
		if (!isSubstanceData(data)) throw new Error('Invalid substance data');
		const substance = Substances.find((s) => s.id === data.id);
		if (!substance) throw new Error(`Unknown substance: ${data.id}`);
		this.substance = substance;
	}

	toStorageData(): SubstanceData {
		return { ...this.data };
	}
	get id() {
		return this.substance.id;
	}

	get isValid() {
		return SubstanceIds.includes(this.id);
	}

	get label() {
		return this.substance.name;
	}

	get pureDensity() {
		return this.substance.pureDensity;
	}

	get substanceId() {
		return this.substance.id;
	}

	get name() {
		return this.substance.name;
	}

	getEquivalentSugarMass(mass: number): number {
		// sweetness of 1 is equivalent to sucrose
		const sweetness = this.substance.sweetness;
		return mass * sweetness;
	}

	getWaterVolume(mass: number): number {
		return this.substance.id === 'water' ? mass : 0;
	}

	getWaterMass(mass: number): number {
		return this.substance.id === 'water' ? mass : 0;
	}

	getAlcoholMass(mass: number): number {
		return this.substance.id === 'ethanol' ? mass : 0;
	}

	getAlcoholVolume(mass: number): number {
		return this.substance.id === 'ethanol' ? this.getVolume(mass) : 0;
	}

	getAbv(mass: number): number {
		return this.substance.id === 'ethanol' ? 100 : 0;
	}

	getProof(mass: number): number {
		return this.getAbv(mass) * 2;
	}

	getBrix(): number {
		return this.substance.sweetness * 100;
	}

	partialSolutionDensity(concentration = 1): number {
		if (this.substance.id === 'water') return 1;
		concentration = Math.min(1, Math.max(0, concentration));
		if (this.substance.solutionDensityMeasurements.length) {
			const interpolated = interpolator(this.substance.solutionDensityMeasurements, concentration);
			return interpolated - 1;
		}
		// naive linear interpolation
		return concentration * (this.pureDensity - 1);
	}

	getVolume(mass: number): number {
		return mass / this.pureDensity;
	}

	getKcal(mass: number): number {
		return mass * this.substance.kcal;
	}

	getPH(mass: number): number {
		if (this.substance.pKa.length) {
			// Calculate pH based on dissociation constants
			// - The first dissociation is usually the strongest contributor
			// - Each subsequent dissociation typically has less impact
			// - The differences between our simplified model and a full
			// equilibrium calculation would likely be smaller than natural
			// variation in ingredients
			let totalH = 0;
			for (const [i, pKa] of this.substance.pKa.entries()) {
				const Ka = Math.pow(10, -pKa);
				// Weight later dissociations less
				const weight = 1 / (i + 1);
				totalH += weight * Math.sqrt(Ka * this.getMolarity(mass));
			}
			return -Math.log10(totalH);
		}
		// Default to neutral pH for substances without acid dissociation
		return 7;
	}

	getMolarity(mass: number): number {
		return mass / this.substance.molecule.molecularMass;
	}

	describe() {
		return this.substance.name;
	}
}
