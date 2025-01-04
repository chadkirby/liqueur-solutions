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

/**
 * Finds a root of a function using the bisection method.
 * The method repeatedly bisects an interval and selects the subinterval where the function changes sign.
 *
 * @param fn - The continuous function to find the root of
 * @param left - Left endpoint of initial interval
 * @param right - Right endpoint of initial interval
 * @param tolerance - Tolerance for the solution (controls accuracy)
 * @returns The approximate root value
 * @throws {Error} If initial points don't bracket a root (f(a) and f(b) have same sign)
 *
 * @example
 * const f = (x: number) => x*x - 2; // find square root of 2
 * const root = bisection(f, 1, 2, 0.0001); // ≈ 1.4142
 */
export function bisection(
	fn: (x: number) => number,
	left: number,
	right: number,
	tolerance: number,
): number {
	// Verify that the interval brackets a root by checking if f(a) and f(b) have opposite signs
	if (fn(left) * fn(right) >= 0) {
		console.log(`f(${left}):`, fn(left), `f(${right}):`, fn(right));
		throw 'Initial guesses do not bracket a root.';
	}

	let x = left;
	// Continue until interval width is less than tolerance
	while ((right - left) / 2 > tolerance) {
		// Calculate midpoint
		x = (left + right) / 2;

		// If we hit the root exactly, we're done
		if (fn(x) == 0) break;
		// If f(left) and f(x) have opposite signs, root is in left half
		else if (fn(left) * fn(x) < 0) right = x;
		// Otherwise, root is in right half
		else left = x;
	}
	return x;
}

/**
 * Calculates the molar concentration (molarity) of a substance in solution.
 * Molarity (M) is defined as moles of solute per liter of solution.
 *
 * @param substance - The acid substance containing molecular mass information
 * @param gramsOfSubstance - Mass of the substance in grams
 * @param solutionMl - Volume of the solution in milliliters
 * @returns The molar concentration in mol/L (M)
 *
 * @example
 * const hcl = { molecule: { molecularMass: 36.46 } };
 * const molarity = getMolarConcentration(hcl, 3.646, 1000); // = 0.1M
 */
export function getMolarConcentration(
	substance: AcidSubstance,
	gramsOfSubstance: number,
	solutionMl: number,
): number {
	// Convert mass to moles using molecular mass (g/mol)
	const moles = gramsOfSubstance / substance.molecule.molecularMass;

	// Convert solution volume from mL to L
	const liters = solutionMl / 1000;

	// Calculate molarity (M = mol/L)
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

/**
 * Calculates pH of polyprotic acid solutions using numerical methods.
 * Uses an extended version of the Henderson-Hasselbalch equation for multiple dissociation steps.
 * Solves the charge balance equation using the bisection method.
 *
 * Theory:
 * - For a polyprotic acid HₙA, each dissociation step has its own Ka value
 * - System is modeled using simultaneous equilibria for all dissociation steps
 * - Charge balance: [H⁺] + [M⁺] = [OH⁻] + [A⁻] + 2[A²⁻] + ... + n[Aⁿ⁻]
 *
 * @param params - Object containing:
 *   @param acidMolarity - Initial concentration of acid (mol/L)
 *   @param conjugateBaseMolarity - Concentration of conjugate base (mol/L)
 *   @param pKa - Array of pKa values for each dissociation step
 *   @param dissociationFactor - Fraction of acid already dissociated (0-1)
 * @returns Object containing pH and [H⁺] concentration
 *
 * @example
 * const result = calculatePh({
 *   acidMolarity: 0.1,
 *   pKa: [2.15, 7.20, 12.35], // H₃PO₄
 * });
 */
export function calculatePh({
	acidMolarity,
	conjugateBaseMolarity = 0,
	pKa,
	dissociationFactor = 0,
}: PhInput): PhResult {
	// Convert pKa to Ka (acid dissociation constants)
	const Ka = pKa.map((pk) => 10 ** -pk);

	// Calculate undissociated acid concentration
	const freeAcidMolarity = acidMolarity * (1 - dissociationFactor);

	/**
	 * Charge balance function to find root of.
	 * When f(H) = 0, we have found the equilibrium [H⁺]
	 */
	function f(H: number): number {
		// Total acid from both free acid and conjugate base
		const totalAcid = freeAcidMolarity + conjugateBaseMolarity;

		// Number of possible charged species
		const maxCharge = Ka.length;

		// Calculate alpha factors (fraction of each species)
		let denominator = 1; // Σ terms in partition function
		let kProducts: number[] = [1]; // [1, Ka₁/[H⁺], Ka₁Ka₂/[H⁺]², ...]

		// Build up products for each species
		for (let i = 0; i < maxCharge; i++) {
			const nextK = (kProducts[i] * Ka[i]) / H;
			kProducts.push(nextK);
			denominator += nextK;
		}

		// Sum all positive charges: [H⁺] + contribution from conjugate base
		let positiveCharges = H + maxCharge * conjugateBaseMolarity;

		// Start with [OH⁻] from water self-ionization
		let negativeCharges = 1e-14 / H;

		// Add negative charges from each acid species
		for (let i = 1; i <= maxCharge; i++) {
			negativeCharges += (totalAcid * (i * kProducts[i])) / denominator;
		}

		// Return difference (root = charge balance)
		return positiveCharges - negativeCharges;
	}

	// Solve for [H⁺] between pH -14 and 14
	const H_root = bisection(f, 1e-14, 1, 1e-9);
	return { pH: -Math.log10(H_root), H: H_root };
}

export function getMoles(substance: AcidSubstance, mass: number): number {
	return mass / substance.molecule.molecularMass;
}

export function getVolume(substance: AcidSubstance, mass: number): number {
	return mass / substance.pureDensity;
}
