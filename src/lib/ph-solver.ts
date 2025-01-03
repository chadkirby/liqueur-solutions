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

export function equilibriumPh(
	substance: AcidSubstance,
	gOfSubstance: number,
	mlOfSolution: number,
): PhResult {
	if (!substance.pKa.length) return { pH: 7, H: 0 };

	const molesOfSubstance = getMoles(substance, gOfSubstance);
	const concentration = molesOfSubstance / (mlOfSolution / 1000);

	// assume the first dissociation dominates
	const Ka = Math.pow(10, -substance.pKa[0]);

	// Simple quadratic equation for weak acid equilibrium
	// x^2 + Ka*x - Ka*C = 0
	// where x is [H+]
	const a = 1;
	const b = Ka;
	const c = -Ka * concentration;
	const H = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);

	return { pH: -Math.log10(H), H };
}

function bisection(f: (x: number) => number, a: number, b: number, tol: number): number {
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

export function bisectPh(
	substance: AcidSubstance,
	gOfSubstance: number,
	mlOfSolution: number,
): PhResult {
	// Step 1: Calculate the moles of the substance
	const molesOfSubstance = gOfSubstance / substance.molecule.molecularMass;

	// Step 2: Calculate the total concentration of the substance in the solution
	const C_total = molesOfSubstance / (mlOfSolution / 1000);

	// Step 3: Calculate the Ka values from the pKa values
	const K_a = substance.pKa.map((pk) => 10 ** -pk);

	// Step 4: Define the charge balance equation
	function f(H: number): number {
		let sumNegativelyCharged = 0;

		// Calculate the denominator for alpha fractions
		let denom = 1; // Represents [H+]^n
		for (let j = 0; j < K_a.length; j++) {
			let term = 1;
			for (let k = 0; k <= j; k++) {
				term *= K_a[k];
			}
			denom += term / Math.pow(H, j + 1);
		}

		// Calculate the concentration of each negatively charged species
		for (let i = 1; i <= K_a.length; i++) {
			// Calculate the numerator for the current species
			let num = 1;
			for (let j = 0; j < i; j++) {
				num *= K_a[j];
			}
			num /= Math.pow(H, i);

			// Calculate the alpha fraction for the current species
			const alpha = num / denom;

			// Calculate the concentration of the current species
			const conc = C_total * alpha;

			// Add the contribution of the current species to the sum of negatively charged species
			sumNegativelyCharged += i * conc;
		}

		// Include the OH- contribution in the charge balance equation
		const OH = 1e-14 / H;

		// The charge balance equation: [H+] - sum of negatively charged species - [OH-] = 0
		return H - sumNegativelyCharged - OH;
	}

	// Step 5: Define initial guesses for [H+]
	const H_min = 1e-14;
	const H_max = 1;

	// Step 7: Use the bisection method to find the root of f(H)
	const H_root = bisection(f, H_min, H_max, 1e-9);

	// Step 8: Calculate the pH from [H+]
	const pH = -Math.log10(H_root);

	// Step 10: Return the pH and [H+]
	return { pH: pH, H: H_root };
}

export function getMoles(substance: AcidSubstance, mass: number): number {
	return mass / substance.molecule.molecularMass;
}

export function getVolume(substance: AcidSubstance, mass: number): number {
	return mass / substance.pureDensity;
}

export function simplePH(
	substance: AcidSubstance,
	gOfSubstance: number,
	mlOfSolution: number,
): PhResult {
	// Use the lowest pKa for the initial approximation
	const pKa1 = Math.min(...substance.pKa);
	const Ka1 = Math.pow(10, -pKa1);

	const concentration = getMoles(substance, gOfSubstance) / (mlOfSolution / 1000);

	// Quadratic formula to solve for [H+]
	const discriminant = Ka1 * (4 * concentration) + Math.pow(Ka1, 2);
	const H = (-Ka1 + Math.sqrt(discriminant)) / 2;

	return { pH: -Math.log10(H), H };
}
