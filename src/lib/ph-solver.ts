/*
  Example substance:
	{
		molecule: new Molecule('C6H8O7'),
		pureDensity: 1.66,
		pKa: [3.13, 4.76, 5.4],
	}
 */

import { isClose } from './solver.js';

export interface AcidSubstance {
	molecule: {
		molecularMass: number;
	};
	pureDensity: number;
	pKa: number[];
}

export type PhResult = {
	pH: number;
	H: number;
};

export function bisection(f: (x: number) => number, a: number, b: number, tol: number): number {
	if (f(a) * f(b) >= 0) {
		console.log(`f(${a}):`, f(a), `f(${b}):`, f(b));
		throw 'Initial guesses do not bracket a root.';
	}
	let c = a;
	while ((b - a) / 2 > tol) {
		c = (a + b) / 2;
		if (f(c) == 0) break;
		else if (f(a) * f(c) < 0) b = c;
		else a = c;
	}
	return c;
}

export type AcidSystem = {
	acid: { conc: number; pKas: number[] };
	base?: { conc: number };
};

export function calculateAlphas(H: number, pKas: number[]): number[] {
	const Kas = pKas.map((pk) => Math.pow(10, -pk));
	const alphas: number[] = [];

	for (let i = 0; i < pKas.length; i++) {
		let num = 1;
		let denom = 1;

		// Calculate numerator (product of relevant Ka's)
		for (let j = 0; j < i; j++) {
			num *= Kas[j];
		}

		// Calculate denominator terms
		for (let j = 0; j <= pKas.length; j++) {
			let term = Math.pow(H, pKas.length - j);
			for (let k = 0; k < j; k++) {
				term *= Kas[k];
			}
			denom += term;
		}

		alphas[i] = num / denom;
	}
	return alphas;
}

export function getMolarConcentration(
	substance: AcidSubstance,
	gramsOfSubstance: number,
	solutionMl: number,
): number {
	const moles = gramsOfSubstance / substance.molecule.molecularMass;
	const liters = solutionMl / 1000;
	// molarity mol/L = M
	const concentration = moles / liters;
	return concentration;
}

export type PhInput = {
	// Total concentration of the acid
	acidMolarity: number;
	// Any pre-existing conjugate base (e.g. from sodium citrate)
	conjugateBaseMolarity: number;
	// pKa values from the acid
	pKa: number[];
	// For citrus juices, what fraction is already dissociated
	dissociationFactor?: number;
};

export function calculatePh({
	acidMolarity,
	conjugateBaseMolarity = 0,
	pKa,
	dissociationFactor = 0,
}: PhInput): PhResult {
	const Ka = pKa.map((pk) => 10 ** -pk);
	const freeAcidMolarity = acidMolarity * (1 - dissociationFactor);
	const totalConjugateBase = conjugateBaseMolarity + acidMolarity * dissociationFactor;

	// For a buffer system, pH is usually near one of the pKa values
	// Let's use that to set better bounds
	const avgPka = pKa.reduce((a, b) => a + b, 0) / pKa.length;
	const H_min = 10 ** -(avgPka + 4); // pH = avgPka + 4
	const H_max = 10 ** -(avgPka - 4); // pH = avgPka - 4

  function f(H: number): number {
		// Total citrate from both sources
		const totalCitrate = freeAcidMolarity + conjugateBaseMolarity;

		// For n pKa values, we're dealing with species of charge -n through -1
		const maxCharge = Ka.length; // e.g., 3 for citric acid

		// Start with most dissociated form (charge = -maxCharge)
		let denominator = 1;
		let lastK = 1;
		const kValues: number[] = [];

		// Only use Ka[maxCharge-1] through Ka[1] for charged species
		for (let i = maxCharge - 1; i >= 1; i--) {
			if (i === maxCharge - 1) {
				lastK = H / Ka[i]; // First K (K3)
			} else {
				lastK = (lastK * (lastK * H)) / Ka[i]; // Subsequent Ks use previous K
			}
			kValues.push(lastK);
			denominator += lastK;
		}

		// Calculate charge balance
		let positiveCharges = H + maxCharge * conjugateBaseMolarity;

		{
			// works:
			const K3 = H / Ka[2]; // For Cit³⁻ + H⁺ ⇌ HCit²⁻
			const K2 = (K3 * H) / Ka[1]; // For HCit²⁻ + H⁺ ⇌ H₂Cit⁻

			let negativeCharges =
				totalCitrate *
				((3 * 1) / denominator + // Cit³⁻ + // Cit³⁻
					(2 * K3) / denominator + // HCit²⁻
					(1 * (K3 * K2)) / denominator); // H₂Cit⁻

			console.log(
				'works:',
				`${negativeCharges.toFixed(6)} =`,
				`${totalCitrate.toFixed(2)} * ((3 * 1) / ${denominator.toFixed(2)}`,
				`+ (2 * ${K3.toFixed(2)}) / ${denominator.toFixed(2)}`,
				`+ (1 * (${K3.toFixed(2)} * ${K2.toFixed(2)})) / ${denominator.toFixed(2)})`,
			);
		}
		let negativeCharges =
			totalCitrate *
			((maxCharge * 1) / denominator + // Most dissociated
				((maxCharge - 1) * kValues[0]) / denominator + // Using K3
				((maxCharge - 2) * kValues[1]) / denominator); // Using K3*K2

		console.log(
			'broke:',
			`${negativeCharges.toFixed(6)} =`,
			`${totalCitrate.toFixed(2)} * ((${maxCharge} * 1) / ${denominator.toFixed(2)}`,
			`+ (${maxCharge - 1} * ${kValues[0].toFixed(2)}) / ${denominator.toFixed(2)}`,
			`+ (${maxCharge - 2} * ${kValues[1].toFixed(2)}) / ${denominator.toFixed(2)})`,
		);
		negativeCharges += 1e-14 / H; // OH⁻

		return positiveCharges - negativeCharges;
	}
	const H_root = bisection(f, H_min, H_max, 1e-9);
	return { pH: -Math.log10(H_root), H: H_root };
}

export function getMoles(substance: AcidSubstance, mass: number): number {
	return mass / substance.molecule.molecularMass;
}

export function getVolume(substance: AcidSubstance, mass: number): number {
	return mass / substance.pureDensity;
}
