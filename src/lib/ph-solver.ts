import { getCitrusDissociationFactor, getCitrusPrefix } from './ingredients/citrus-ids.js';
import { getConjugateAcids, type SaltType } from './ingredients/substances.js';
import type { DecoratedSubstance } from './mixture-types.js';
import type { SubstanceItem } from './mixture.js';

/*
  Example substance:
	{
		molecule: new Molecule('C6H8O7'),
		pureDensity: 1.66,
		pKa: [3.13, 4.76, 5.4],
	}
 */

export function getMixturePh(
	mxVolume: number,
	substances: DecoratedSubstance[],
): { molesH: number; pH: number } {
	let totalMolesH = 0;

	// Group acids with their conjugate bases
	const acidGroups = getAcidGroups(substances);

	// calculate pH contribution from each acid group
	for (const group of acidGroups.values()) {
		const { acid, conjugateBase } = group;
		const citrusId = getCitrusPrefix(acid.mixtureId);
		// Calculate undissociated acid concentration
		const citrusDissociationFactor = citrusId ? getCitrusDissociationFactor(citrusId) : 0;
		const acidMolarity =
			getMolarConcentration(acid.item.substance, acid.mass, mxVolume) *
			(1 - citrusDissociationFactor);

		const conjugateBaseMol = conjugateBase
			? getMolarConcentration(conjugateBase.item.substance, conjugateBase.mass, mxVolume)
			: 0;

		// NB: experimentally, I get a pH of 4.1 for 2% citric acid and 2%
		// sodium citrate in water, but we would compute it as 4.4 unless we
		// add an activity coefficient to account for non-ideal behavior in
		// typical solutions.
		const activityCoeff = estimateActivityCoefficient(
			acidMolarity,
			conjugateBaseMol,
			acid.item.pKa.length, // number of possible charges
		);

		const phData = calculatePh({
			acidMolarity,
			// Apply activity coefficient to conjugate base concentration
			// NB: Experimental results suggest ~0.7 for citrate buffer at 0.1M
			conjugateBaseMolarity: conjugateBase ? conjugateBaseMol * activityCoeff : 0,
			pKa: acid.item.pKa,
		});
		totalMolesH += phData.H;
	}

	return { pH: totalMolesH ? -Math.log10(totalMolesH) : 7, molesH: totalMolesH };
}

/**
 * Group acids with their conjugate bases.
 */
function getAcidGroups(substances: DecoratedSubstance[]): Map<
	string,
	{
		acid: SubstanceItem;
		conjugateBase?: SubstanceItem;
	}
> {
	// Group acids with their conjugate bases
	const acidGroups = new Map<
		string,
		{
			acid: SubstanceItem;
			conjugateBase?: SubstanceItem;
		}
	>();

	// First pass - find acids
	for (const substance of substances) {
		if (substance.item.pKa.length > 0) {
			// Create unique ID for each acid
			acidGroups.set(substance.substanceId, { acid: substance });
		}
	}

	// Second pass - match conjugate bases to acids
	for (const substance of substances) {
		const matchingAcids = getConjugateAcids(substance.substanceId);
		// For each acid that matches this base
		for (const acidId of matchingAcids) {
			const group = acidGroups.get(acidId);
			if (group) {
				group.conjugateBase = substance;
			}
		}
	}

	return acidGroups;
}

export type PhResult = {
	pH: number;
	H: number;
};

export type PhInput = {
	// Total concentration of the acid
	acidMolarity: number;
	// Any pre-existing conjugate base (e.g. from sodium citrate)
	conjugateBaseMolarity: number;
	// pKa values from the acid
	pKa: number[];
	// Experimentally determined to be ~0.7-0.9 for citrate buffers around 0.1M
	// More validation needed for other conditions
	activityCoefficient?: number;
};

/**
 * Calculates pH of polyprotic acid solutions using numerical methods.
 *
 * Uses an extended version of the Henderson-Hasselbalch equation for
 * multiple dissociation steps.
 *
 * Solves the charge balance equation using the bisection method.
 *
 * Theory:
 * - For a polyprotic acid HₙA, each dissociation step has its own Ka
 *   value
 * - System is modeled using simultaneous equilibria for all
 *   dissociation steps
 * - Charge balance: [H⁺] + [M⁺] = [OH⁻] + [A⁻] + 2[A²⁻] + ... + n[Aⁿ⁻]
 *
 * @param params - Object containing:
 *   @param acidMolarity - Initial concentration of acid (mol/L) @param
 *   conjugateBaseMolarity - Concentration of conjugate base (mol/L)
 *   @param pKa - Array of pKa values for each dissociation step @param
 *   dissociationFactor - Fraction of acid already dissociated (0-1)
 * @returns Object containing pH and [H⁺] concentration
 *
 * @example const result = calculatePh({ acidMolarity: 0.1, pKa: [2.15,
 * 7.20, 12.35], // H₃PO₄ });
 */
export function calculatePh({ acidMolarity, conjugateBaseMolarity = 0, pKa }: PhInput): PhResult {
	// Convert pKa to Ka (acid dissociation constants)
	const Ka = pKa.map((pk) => 10 ** -pk);

	/**
	 * Charge balance function to find root of.
	 * When f(H) = 0, we have found the equilibrium [H⁺]
	 */
	function f(H: number): number {
		// Total acid from both free acid and conjugate base
		const totalAcid = acidMolarity + conjugateBaseMolarity;

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

export interface AcidSubstance {
	molecule: {
		molecularMass: number;
	};
	pureDensity: number;
	pKa: number[];
}

export function getMoles(substance: AcidSubstance, mass: number): number {
	return mass / substance.molecule.molecularMass;
}

export function getVolume(substance: AcidSubstance, mass: number): number {
	return mass / substance.pureDensity;
}

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
function bisection(
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
function getMolarConcentration(
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

/**
 * Estimates activity coefficient based on solution ionic strength.
 * Uses a simplified form of the Debye-Hückel equation.
 * Only valid for ionic strengths < 0.1M
 */
function estimateActivityCoefficient(
	acidMolarity: number,
	conjugateBaseMolarity: number,
	maxCharge: number,
): number {
	// Rough estimate of ionic strength (I)
	// For citrate: counts H+, conjugate base charges, etc
	const ionicStrength = acidMolarity + maxCharge * conjugateBaseMolarity;

	// Simplified Debye-Hückel equation
	// Valid only for dilute solutions (I < 0.1M)
	// For more concentrated solutions, would need Davies or extended D-H
	return 1 - 0.5 * Math.sqrt(ionicStrength);
}

/**
 * Calculates the total buffer capacity of a mixture by summing the contributions
 * of all acid-base buffer pairs present.
 *
 * @param mxVolume - Volume of the mixture in milliliters
 * @param substances - Array of substances in the mixture
 * @returns Total buffer capacity in mol/L/pH unit
 */
export function calculateTotalBufferCapacity(
	mxVolume: number,
	substances: DecoratedSubstance[],
): number {
	// Group acids with their conjugate bases
	const acidGroups = getAcidGroups(substances);

	return [...acidGroups.values()].reduce((acc, group) => {
		const { acid, conjugateBase } = group;
		if (!conjugateBase) return acc;
		const bufferCapacity = calculateBufferCapacity(
			getMolarConcentration(acid.item.substance, acid.mass, mxVolume),
			getMolarConcentration(conjugateBase.item.substance, conjugateBase.mass, mxVolume),
			acid.item.pKa[0],
		);
		return acc + bufferCapacity;
	}, 0);
}

/**
 * Calculates the buffer capacity (β) of a single acid-base buffer pair.
 * Buffer capacity is defined as the number of moles of acid or base needed
 * to change the pH by one unit.
 *
 * Uses the equation: β = (2.303 * C * Ka * [H+]) / (Ka + [H+])²
 * where:
 * - C is total concentration of acid + conjugate base
 * - Ka is the acid dissociation constant
 * - [H+] is the hydrogen ion concentration
 *
 * @param acidConcentration - Concentration of acid in mol/L
 * @param conjugateBaseConcentration - Concentration of conjugate base in mol/L
 * @param pKa - Negative log of acid dissociation constant
 * @returns Buffer capacity in mol/L/pH unit
 */
function calculateBufferCapacity(
	acidConcentration: number,
	conjugateBaseConcentration: number,
	pKa: number,
): number {
	const totalConcentration = acidConcentration + conjugateBaseConcentration;
	const Ka = Math.pow(10, -pKa);
	const pH = -Math.log10(acidConcentration / conjugateBaseConcentration) + pKa;
	const H = Math.pow(10, -pH);

	// Van Slyke equation for buffer capacity
	const bufferCapacity = (2.303 * totalConcentration * Ka * H) / Math.pow(Ka + H, 2);
	return bufferCapacity;
}
