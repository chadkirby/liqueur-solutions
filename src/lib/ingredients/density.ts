/**
 * Density Correction for Ethanol-Water Mixtures
 *
 * When mixing ethanol and water, the resulting volume is NOT simply the sum of the individual volumes.
 * Due to molecular interactions (hydrogen bonding), the molecules pack more tightly than in either pure liquid.
 * This effect is significant - the volume contraction can be up to 4% of the total volume.
 *
 * This module implements a practical approximation using a lookup table of experimental density data
 * from Engineering ToolBox: https://www.engineeringtoolbox.com/ethanol-water-mixture-density-d_2162.html
 *
 * The implementation:
 * 1. Uses density values at 20°C (room temperature)
 * 2. Interpolates between known data points for smooth transitions
 * 3. Provides ~0.1% accuracy which is sufficient for beverage calculations
 * 4. Handles the full range from pure water to pure ethanol
 */

import { interpolator, Substances } from './substances.js';

/**
 * Calculate the masses of ethanol and water needed to reach a target
 * volume/ABV of a mixture.
 *
 * Since ethanol-water mixtures exhibit volume contraction, this
 * requires iteration to find the correct input volumes that will yield
 * the desired final volume and ABV. Uses root-finding algorithm
 * (Newton-Raphson).
 *
 * @param substance - Substance to calculate proportions for
 *
 * @param targetAbv - Target alcohol by volume percentage
 *
 * @returns Object containing required weight-percent proportions of the
 * substance and water and the density of the mixture
 */
export function calculateAbvProportions(targetAbv: number, targetVolume = 100) {
	const substanceId = 'ethanol';
	// round targetAbv to 4 decimal places
	const rounded = Math.round(targetAbv * 10000) / 10000;
	if (rounded < 0 || rounded > 100) throw new Error('Target ABV must be between 0 and 100');

	targetAbv = Math.max(0, Math.min(100, targetAbv)); // Ensure within bounds

	const ethanol = Substances.find((s) => s.id === substanceId);
	const water = Substances.find((s) => s.id === 'water');
	if (!ethanol || !water) {
		throw new Error(`Unknown substance: ${substanceId}`);
	}

	// Constants
	const tolerance = 0.001; // % tolerance
	const maxIterations = 100;
	let ethanolVolume = targetVolume * (targetAbv / 100);
	let ethanolMass = 0;
	let waterMass = 0;
	let totalMass = 0;
	let actualVolume = 0;
	let actualABV = 0;

	const getDensity = (concentration: number) => {
		if (!ethanol) {
			throw new Error('Substance not found');
		}
		return interpolator(ethanol.solutionDensityMeasurements, concentration);
	};

	for (let iteration = 0; iteration < maxIterations; iteration++) {
		ethanolMass = ethanolVolume * ethanol.pureDensity;
		waterMass = (targetVolume - ethanolVolume) * water.pureDensity;
		totalMass = ethanolMass + waterMass;
		const weightPercent = ethanolMass / totalMass;

		const density_mixture = getDensity(weightPercent);
		actualVolume = totalMass / density_mixture;
		actualABV = (ethanolVolume / actualVolume) * 100;
		const error = targetAbv - actualABV;
		if (Math.abs(error) < tolerance) {
			break;
		}

		// Newton-Raphson adjustment
		const delta = 1e-6;
		const ethanolPlusVolume = ethanolVolume + delta;
		const ethanolPlusMass = ethanolPlusVolume * ethanol.pureDensity;
		const waterPlusMass = (targetVolume - ethanolPlusVolume) * water.pureDensity;
		const totalPlusMass = ethanolPlusMass + waterPlusMass;
		const weightPercentPlus = ethanolPlusMass / totalPlusMass;
		const densityPlus = getDensity(weightPercentPlus);
		const actualVolumePlus = totalPlusMass / densityPlus;
		const ABV_actualPlus = (ethanolPlusVolume / actualVolumePlus) * 100;
		const f = actualABV - targetAbv;
		const fPlus = ABV_actualPlus - targetAbv;
		const derivative = (fPlus - f) / delta;

		if (derivative === 0) {
			break; // Avoid division by zero
		}

		ethanolVolume -= f / derivative;
		ethanolVolume = Math.max(0, Math.min(targetVolume, ethanolVolume)); // Ensure within bounds
	}

	totalMass = ethanolMass + waterMass;

	return {
		ethanolMass: ethanolMass / totalMass,
		waterMass: waterMass / totalMass
	};
}
