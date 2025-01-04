/*
  Example substance:
	{
		molecule: new Molecule('C6H8O7'),
		pureDensity: 1.66,
		pKa: [3.13, 4.76, 5.4],
	}
 */

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

	function f(H: number): number {
		// Total acid from both sources
		const totalAcid = freeAcidMolarity + conjugateBaseMolarity;

		// Number of dissociation steps = number of pKa values
		const maxCharge = Ka.length;

		// Calculate K products and denominator
		let denominator = 1;
		let kProducts: number[] = [1]; // Start with neutral species

		// Build up products of K values and H+
		for (let i = 0; i < maxCharge; i++) {
			const nextK = (kProducts[i] * Ka[i]) / H;
			kProducts.push(nextK);
			denominator += nextK;
		}

		// Calculate charge balance
		let positiveCharges = H + maxCharge * conjugateBaseMolarity;
		let negativeCharges = 1e-14 / H; // OH⁻

		// Sum up negative charges from each species
		// Skip first element (i=0) as it represents neutral species
		for (let i = 1; i <= maxCharge; i++) {
			negativeCharges += (totalAcid * (i * kProducts[i])) / denominator;
		}

		return positiveCharges - negativeCharges;
	}

	const H_root = bisection(f, 1e-14, 1, 1e-9);
	return { pH: -Math.log10(H_root), H: H_root, f };
}

export function getMoles(substance: AcidSubstance, mass: number): number {
	return mass / substance.molecule.molecularMass;
}

export function getVolume(substance: AcidSubstance, mass: number): number {
	return mass / substance.pureDensity;
}
