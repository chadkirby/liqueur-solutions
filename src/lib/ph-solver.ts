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
	console.log('Calculating pH with:', {
		acidMolarity,
		conjugateBaseMolarity,
		pKa,
		dissociationFactor,
	});

	// Convert pKa to Ka
	const Ka = pKa.map((pk) => 10 ** -pk);

	// If this is citrus juice, adjust the free acid concentration
	const freeAcidMolarity = acidMolarity * (1 - dissociationFactor);
	// The dissociated portion adds to our conjugate base
	const totalConjugateBase = conjugateBaseMolarity + acidMolarity * dissociationFactor;

	console.log('After adjustments:', {
		freeAcidMolarity,
		totalConjugateBase,
		Ka,
	});

	function f(H: number): number {
		let sumNegativelyCharged = 0;

		// From pre-existing citrate
		const citrate3Minus = 3 * totalConjugateBase;
		sumNegativelyCharged += citrate3Minus;

		// Calculate denominators for acid dissociation
		let denom = 1; // [H+]^n term
		for (let j = 0; j < Ka.length; j++) {
			let term = 1;
			for (let k = 0; k <= j; k++) {
				term *= Ka[k];
			}
			denom += term / Math.pow(H, j + 1);
		}

		// Calculate each dissociation state contribution
		let dissociatedContributions = 0;
		for (let i = 1; i <= Ka.length; i++) {
			let num = 1;
			for (let j = 0; j < i; j++) {
				num *= Ka[j];
			}
			num /= Math.pow(H, i);
			const alpha = num / denom;
			const conc = freeAcidMolarity * alpha;
			dissociatedContributions += i * conc;
		}
		sumNegativelyCharged += dissociatedContributions;

		const OH = 1e-14 / H;

		// Log all contributions
		if (Math.abs(-Math.log10(H) - 5.5) < 1) {
			console.log('Near target pH:', {
				pH: -Math.log10(H),
				citrate3Minus,
				dissociatedContributions,
				OH,
				total: H - sumNegativelyCharged - OH,
			});
		} else {
			console.log('Not near target pH:', {
				pH: -Math.log10(H),
				citrate3Minus,
				dissociatedContributions,
				OH,
				total: H - sumNegativelyCharged - OH,
			});
		}

		return H - sumNegativelyCharged - OH;
	}
	// Use bisection as before
	const H_root = bisection(f, 1e-14, 1, 1e-9);
	return { pH: -Math.log10(H_root), H: H_root };
}

export function getMoles(substance: AcidSubstance, mass: number): number {
	return mass / substance.molecule.molecularMass;
}

export function getVolume(substance: AcidSubstance, mass: number): number {
	return mass / substance.pureDensity;
}
