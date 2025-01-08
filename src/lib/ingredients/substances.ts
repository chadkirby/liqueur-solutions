interface AtomicElement {
	count: number;
	name: string;
	atomicMass: number;
}

const Elements = {
	H: { name: 'Hydrogen', atomicMass: 1.008 },
	C: { name: 'Carbon', atomicMass: 12.011 },
	O: { name: 'Oxygen', atomicMass: 15.9994 },
	N: { name: 'Nitrogen', atomicMass: 14.0067 },
	Cl: { name: 'Chlorine', atomicMass: 35.45 },
	K: { name: 'Potassium', atomicMass: 39.098 },
	Ca: { name: 'Calcium', atomicMass: 40.078 },
	P: { name: 'Phosphorus', atomicMass: 30.973762 },
	Na: { name: 'Sodium', atomicMass: 22.989769 },
	Mg: { name: 'Magnesium', atomicMass: 24.305 },
	S: { name: 'Sulfur', atomicMass: 32.06 },
} as const satisfies Record<string, Omit<AtomicElement, 'count'>>;

const KnownElements = Object.keys(Elements);

function isKnownElement(name: string): name is keyof typeof Elements {
	return KnownElements.includes(name);
}

export class Molecule {
	private readonly elements: AtomicElement[] = [];
	constructor(readonly formula: string = '') {
		for (const el of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
			const [, id, count] = el;
			if (!isKnownElement(id)) throw new Error(`Unknown element: ${id}`);
			const element = Elements[id];
			const n = count ? Number(count) : 1;
			this.elements.push({ ...element, count: n });
		}
	}
	/** molecular mass in g/mol */
	get molecularMass(): number {
		const mass = this.elements.reduce(
			(acc, element) => acc + element.atomicMass * element.count,
			0,
		);
		Object.defineProperty(this, 'mass', { value: mass });
		return mass;
	}
	moles(mass: number): number {
		return mass / this.molecularMass;
	}
}

interface _Substance<T extends string> {
	name: string;
	id: T;
	molecule: Molecule;
	pureDensity: number;
	/** density of the pure substance in g/ml, determined according to
	 * concentration by weight */
	solutionDensityMeasurements: InterplTable;
	// how sweet (sucrose = 1)
	sweetness: number;
	// how much energy per gram (kcal)
	kcal: number;
	// negative log of the acid dissociation constant
	pKa: number[];
}

export interface SubstanceData<T extends string> extends Omit<_Substance<T>, 'molecule'> {
	molecularFormula: string;
}

export const Sweeteners = [
	{
		name: 'Sucrose',
		id: 'sucrose',
		molecule: new Molecule('C12H22O11'),
		pureDensity: 1.5875,

		// According to
		// https://www.researchgate.net/publication/330245564_Apparent_Specific_Volumes_of_Sucrose_in_Different_Aqueous_Cosolvent_Mixtures_at_2982_K,
		// a mean value of 0.632 cm3.g–1 for sucrose in aqueous- cosolvent
		// mixtures could be considered as adequate for practical purposes
		// in pharmaceutical industries. This value is equivalent to 1.5823
		// g/ml.
		solutionDensityMeasurements: [
			[0.0, 0.98],
			[0.231, 1.081],
			[0.376, 1.151],
			[0.444, 1.185],
			[0.5, 1.213],
			[0.543, 1.239],
			[0.583, 1.263],
			[1.0, 1.582],
		] as const,
		sweetness: 1,
		kcal: 3.87,
		pKa: [],
	},
	{
		name: 'Fructose',
		id: 'fructose',
		molecule: new Molecule('C6H12O6'),
		pureDensity: 1.694,
		solutionDensityMeasurements: [
			[0, 1.0],
			[0.01, 1.0021],
			[0.05, 1.0181],
			[0.1, 1.0385],
			[0.2, 1.0816],
			[0.3, 1.1276],
			[0.4, 1.1769],
			[1.0, 1.694],
		],
		sweetness: 1.73,
		kcal: 3.73,
		pKa: [],
	},
	{
		name: 'Glucose',
		id: 'glucose',
		molecule: new Molecule('C6H12O6'),
		pureDensity: 1.54,
		solutionDensityMeasurements: [],
		sweetness: 0.74,
		kcal: 3.75,
		pKa: [],
	},
	{
		name: 'Allulose',
		id: 'allulose',
		molecule: new Molecule('C6H12O6'),
		pureDensity: 1.6,
		solutionDensityMeasurements: [],
		sweetness: 0.7,
		kcal: 0.4,
		pKa: [],
	},
	{
		name: 'Erythritol',
		id: 'erythritol',
		molecule: new Molecule('C4H10O4'),
		pureDensity: 1.45,
		solutionDensityMeasurements: [],
		sweetness: 0.65,
		kcal: 0.2,
		pKa: [],
	},
	{
		name: 'Sucralose',
		id: 'sucralose',
		molecule: new Molecule('C12H19Cl3O8'),
		pureDensity: 1.69,
		solutionDensityMeasurements: [],
		sweetness: 600,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Lactose',
		id: 'lactose',
		molecule: new Molecule('C12H22O11'),
		pureDensity: 1.53,
		solutionDensityMeasurements: [],
		sweetness: 0.16,
		kcal: 4,
		pKa: [],
	},
] as const satisfies _Substance<string>[];

export const Acids = [
	{
		name: 'Citric Acid',
		id: 'citric-acid',
		molecule: new Molecule('C6H8O7'),
		pureDensity: 1.66,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 2.5,
		pKa: [3.13, 4.76, 6.4],
	},
	{
		name: 'Phosphoric Acid',
		id: 'phosphoric-acid',
		molecule: new Molecule('H3PO4'),
		pureDensity: 1.88,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [2.15, 7.21, 12.35],
	},
	{
		name: 'Malic Acid',
		id: 'malic-acid',
		molecule: new Molecule('C4H6O5'),
		pureDensity: 1.609,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 2.4,
		pKa: [3.4, 5.1],
	},
	{
		name: 'Lactic Acid',
		id: 'lactic-acid',
		molecule: new Molecule('C3H6O3'),
		pureDensity: 1.21,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 3.6,
		pKa: [3.86],
	},
	{
		name: 'Acetic Acid',
		id: 'acetic-acid',
		molecule: new Molecule('C2H4O2'),
		pureDensity: 1.049,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 3.5,
		pKa: [4.76],
	},
	{
		name: 'Tartaric Acid',
		id: 'tartaric-acid',
		molecule: new Molecule('C4H6O6'),
		pureDensity: 1.76,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 2.5,
		pKa: [3.03, 4.37],
	},
	{
		name: 'Ascorbic Acid',
		id: 'ascorbic-acid',
		molecule: new Molecule('C6H8O6'),
		pureDensity: 1.65,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 4,
		pKa: [4.17, 11.8],
	},
] as const satisfies _Substance<string>[];

export const Buffers = [
	{
		name: 'Sodium Citrate',
		id: 'sodium-citrate',
		molecule: new Molecule('C6H5Na3O7'),
		pureDensity: 1.857,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Sodium Phosphate',
		id: 'sodium-phosphate',
		molecule: new Molecule('Na3PO4'),
		pureDensity: 2.536,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Sodium Bicarbonate',
		id: 'sodium-bicarbonate',
		molecule: new Molecule('NaHCO3'),
		pureDensity: 2.2,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Sodium Acetate',
		id: 'sodium-acetate',
		molecule: new Molecule('C2H3NaO2'),
		pureDensity: 1.528,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Sodium Malate',
		id: 'sodium-malate',
		molecule: new Molecule('C4H4Na2O5'),
		pureDensity: 1.69,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
] as const satisfies _Substance<string>[];

export const bufferPairs = [
	{ acid: 'citric-acid', base: 'sodium-citrate' },
	{ acid: 'phosphoric-acid', base: 'sodium-phosphate' },
	{ acid: 'malic-acid', base: 'sodium-malate' },
	{ acid: 'lactic-acid', base: 'sodium-citrate' },
	{ acid: 'acetic-acid', base: 'sodium-acetate' },
	{ acid: 'tartaric-acid', base: 'sodium-citrate' },
	{ acid: 'ascorbic-acid', base: 'sodium-citrate' },
] as const satisfies Array<{ acid: SubstanceId; base: SubstanceId }>;

export function getConjugateAcids(base: string): SubstanceId[] {
	const pair = bufferPairs.filter((pair) => pair.base === base);
	return pair.map((pair) => pair.acid);
}

export const Preservatives = [
	{
		name: 'Sodium Benzoate',
		id: 'sodium-benzoate',
		molecule: new Molecule('C7H5NaO2'),
		pureDensity: 1.5,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [4.2],
	},
	{
		name: 'Potassium Sorbate',
		id: 'potassium-sorbate',
		molecule: new Molecule('C6H7KO2'),
		pureDensity: 1.36,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [4.76],
	},
] as const satisfies _Substance<string>[];

export const Solvents = [
	{
		name: 'Water',
		id: 'water',
		molecule: new Molecule('H2O'),
		pureDensity: 1,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Ethanol',
		id: 'ethanol',
		molecule: new Molecule('C2H5OH'),
		pureDensity: 0.7893,
		solutionDensityMeasurements: [
			[0, 1.0], // Pure water
			[0.01, 0.9963],
			[0.05, 0.9893],
			[0.1, 0.9819],
			[0.2, 0.9687],
			[0.3, 0.9539],
			[0.4, 0.9352], // Maximum contraction around
			[0.5, 0.9139],
			[0.6, 0.891],
			[0.7, 0.8676],
			[0.8, 0.843],
			[0.9, 0.818],
			[1.0, 0.7893], // Pure ethanol
		] as const,
		sweetness: 0,
		kcal: 7.1,
		pKa: [],
	},
	{
		name: 'Propylene Glycol',
		id: 'propylene-glycol-solvent',
		molecule: new Molecule('C3H8O2'),
		pureDensity: 1.036,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 4.3,
		pKa: [],
	},
] as const satisfies _Substance<string>[];

export const OtherSubstances = [
	{
		name: 'Inert Substance',
		id: 'inert-substance',
		molecule: new Molecule('C'),
		pureDensity: 1,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Protein',
		id: 'amino-acid',
		molecule: new Molecule('C4H9NO3'), // generic amino acid
		pureDensity: 1.34,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 4,
		pKa: [],
	},
	{
		name: 'Fat',
		id: 'triglyceride',
		molecule: new Molecule('C55H98O6'), // generic triglyceride
		pureDensity: 0.92,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 9,
		pKa: [],
	},
] as const satisfies _Substance<string>[];

export const Salts = [
	{
		name: 'Calcium Sulfate',
		id: 'calcium-sulfate',
		molecule: new Molecule('CaSO4'),
		pureDensity: 2.96,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Sodium Chloride',
		id: 'sodium-chloride',
		molecule: new Molecule('NaCl'),
		pureDensity: 2.165,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Potassium Chloride',
		id: 'potassium-chloride',
		molecule: new Molecule('KCl'),
		pureDensity: 1.98,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Sodium Bicarbonate',
		id: 'sodium-bicarbonate',
		molecule: new Molecule('NaHCO3'),
		pureDensity: 2.2,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [6.4, 10.3],
	},
	{
		name: 'Magnesium Sulfate',
		id: 'magnesium-sulfate',
		molecule: new Molecule('MgSO4'),
		pureDensity: 2.66,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [],
	},
	{
		name: 'Potassium Bicarbonate',
		id: 'potassium-bicarbonate',
		molecule: new Molecule('KHCO3'),
		pureDensity: 2.17,
		solutionDensityMeasurements: [],
		sweetness: 0,
		kcal: 0,
		pKa: [6.4, 10.3],
	},
] as const satisfies _Substance<string>[];

export const Substances = [
	...Solvents,
	...Sweeteners,
	...Acids,
	...Buffers,
	...Preservatives,
	...OtherSubstances,
] as const satisfies _Substance<string>[];

export type SubstanceId = (typeof Substances)[number]['id'];

export const SubstanceIds = Object.freeze(Substances.map((s) => s.id));

export function isSubstanceIid(id: string): id is SubstanceId {
	return SubstanceIds.includes(id as SubstanceId);
}

export const sweetenerIds = Sweeteners.map(({ id }) => id);
export type SweetenerType = (typeof sweetenerIds)[number];

export function isSweetenerId(id: string): id is SubstanceId {
	return sweetenerIds.includes(id as SweetenerType);
}
export function isAcidId(id: string): id is SubstanceId {
	return Acids.some((s) => s.id === id);
}
export function isBufferId(id: string): id is SubstanceId {
	return Buffers.some((s) => s.id === id);
}
export function isPreservativeId(id: string): id is SubstanceId {
	return Preservatives.some((s) => s.id === id);
}
export function isSolventId(id: string): id is SubstanceId {
	return Solvents.some((s) => s.id === id);
}
export function isOtherId(id: string): id is SubstanceId {
	return OtherSubstances.some((s) => s.id === id);
}

export interface Substance extends _Substance<SubstanceId> {
	id: SubstanceId;
}

export type InterplTable = Readonly<Readonly<[number, number]>[]>;
export function interpolator(table: InterplTable, weightPercent: number): number {
	// Find bracketing values
	let lower = table[0];
	let upper = table[table.length - 1];

	for (let i = 0; i < table.length - 1; i++) {
		if (table[i][0] <= weightPercent && table[i + 1][0] > weightPercent) {
			lower = table[i];
			upper = table[i + 1];
			break;
		}
	}

	// Linear interpolation
	const fraction = (weightPercent - lower[0]) / (upper[0] - lower[0]);
	return lower[1] + fraction * (upper[1] - lower[1]);
}
