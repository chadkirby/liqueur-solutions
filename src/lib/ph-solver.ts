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

		// Calculate fraction in each state using H⁺ association constants
		const K3 = H / Ka[2]; // For Cit³⁻ + H⁺ ⇌ HCit²⁻
		const K2 = (K3 * H) / Ka[1]; // For HCit²⁻ + H⁺ ⇌ H₂Cit⁻

		const denom = 1 + K3 + K3 * K2;

		// Charge balance
		let positiveCharges = H + 3 * conjugateBaseMolarity; // H⁺ and Na⁺
		let negativeCharges =
			totalCitrate *
			((3 * 1) / denom + // Cit³⁻ + // Cit³⁻
				(2 * K3) / denom + // HCit²⁻
				(1 * (K3 * K2)) / denom); // H₂Cit⁻

		negativeCharges += 1e-14 / H; // OH⁻

		return positiveCharges - negativeCharges;
	}
	// Before trying bisection, let's scan across a range of pH values
	console.log('Scanning pH range for root:');
	for (let pH = 0; pH <= 14; pH += 1) {
		const H = Math.pow(10, -pH);
		const result = f(H);
		const prev = f(Math.pow(10, -pH - 1));
		// log if the sign changes
		if (prev * result < 0) {
			console.log(`pH ${pH}: f(H) = ${result}`);
		}
	}

	// Then try to find where f(H) changes sign
	console.log('\nFinding sign change:');
	let pH = 0;
	while (pH <= 14) {
		const H = Math.pow(10, -pH);
		const prev = f(Math.pow(10, -pH - 0.25));
		const result = f(H);
		// log if the sign changes
		if (prev * result < 0) {
			console.log(`pH ${pH.toFixed(2)}: f(H) = ${result}`);
		}
		pH += 0.25;
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
