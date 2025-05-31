import { isSubstanceItem, type SubstanceData } from '$lib/data-format.js';
import { type CommonComponent } from '../mixture-types.js';
import {
	Substances,
	type SubstanceId,
	type Substance,
	SubstanceIds,
	interpolator,
} from './substances.js';

const componentTypes = ['substance', 'mixture'] as const;
type ComponentTypes = (typeof componentTypes)[number];

export function isComponentType(type: string): type is ComponentTypes {
	return componentTypes.includes(type as ComponentTypes);
}

/**
 * A SubstanceComponent has no inherent mass. It just provides
 * convenience methods for accessing the underlying substance data.
 */
export class SubstanceComponent implements CommonComponent {
	static new(substanceId: SubstanceId) {
		return new SubstanceComponent({ id: substanceId });
	}
	static fromStorageData(data: SubstanceData) {
		return new SubstanceComponent(data);
	}

	readonly substance: Substance;
	constructor(readonly data: SubstanceData) {
		if (!isSubstanceItem(data)) throw new Error('Invalid substance data');
		const substance = Substances.find((s) => s.id === data.id);
		if (!substance) throw new Error(`Unknown substance: ${data.id}`);
		this.substance = substance;
	}
	readonly referenceMass = 1;

	clone() {
		return new SubstanceComponent(this.serializeSubstanceData());
	}

	serializeSubstanceData(): SubstanceData {
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

	get pKa() {
		return this.substance.pKa;
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

	getAbv(): number {
		return this.substance.id === 'ethanol' ? 100 : 0;
	}

	getProof(): number {
		return this.getAbv() * 2;
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

	getMoles(mass: number): number {
		return mass / this.substance.molecule.molecularMass;
	}

	describe() {
		return this.substance.name;
	}
}
