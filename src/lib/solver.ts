import { Mixture } from './mixture.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import { AnnealingSolver } from 'abstract-sim-anneal';
import { bufferPairs, isAcidId, isSweetenerId } from './ingredients/substances.js';
import type { SolverTarget } from './mixture-types.js';
import { getAcidGroups, type AcidGroups } from './ph-solver.js';
import { FancyIterator } from './iterator.js';

type IngredientClass = 'ethanol' | 'sweetener' | 'acid' | 'base' | 'water';

interface WorkingTarget {
	/** between 0-100 */
	abv: number;
	/** between 0-100 */
	brix: number;
	/** between 0-Infinity */
	volume: number;
	/** between 0-1 */
	molesH: number;
}

export function targetToWorkingTarget(target: SolverTarget): WorkingTarget {
	return {
		abv: target.abv,
		brix: target.brix,
		volume: target.volume,
		// convert pH to moles of H+ ions (which maps more linearly than pH
		// to mass of acid)
		molesH: 10 ** -target.pH,
	};
}

interface MixtureState {
	mixture: Mixture;
	targets: WorkingTarget;
	actual: WorkingTarget;
	/** deviation from target values as a percentage of the target value
	 * between -1, 1 */
	deviations: WorkingTarget;
	/** total deviation from target values */
	error: number;
}

/**
 * Analyze a mixture and determine the deviation from the target values.
 *
 * Exported for testing purposes.
 */
export function analyze(mixture: Mixture, targets: WorkingTarget): MixtureState {
	if (targets.molesH === 0) {
		throw new Error('Target pH must be between 0 and 1');
	}
	if (targets.volume === 0) {
		throw new Error('Target volume must be greater than 0');
	}

	const actual: WorkingTarget = targetToWorkingTarget({
		abv: mixture.abv,
		brix: mixture.brix,
		pH: mixture.pH,
		volume: mixture.volume,
	});
	// determine the deviation from the target values as a percentage
	const deviations: WorkingTarget = {
		abv: getDeviation(actual.abv, targets.abv),
		brix: getDeviation(actual.brix, targets.brix),
		molesH: getDeviation(actual.molesH, targets.molesH),
		volume: getDeviation(actual.volume, targets.volume),
	};

	const error =
		[
			deviations.abv,
			deviations.brix,
			deviations.volume,
			// compute the error in pH, not moles of H+ ions
			getDeviation(-Math.log10(actual.molesH), -Math.log10(targets.molesH)),
		].reduce((acc, v) => acc + v ** 2, 0) ** 0.5;

	return {
		mixture,
		targets,
		actual,
		deviations,
		error,
	};
}

/**
 * Get the deviation of a mixture
 *
 * @return  the deviation as a percentage of the actual value
 */
function getDeviation(actual: number, target: number): number {
	if (target < 0) {
		throw new Error('Target value must be greater than or equal to 0');
	}
	if (target === 0) {
		return actual === 0 ? 0 : 1;
	}
	if (actual === 0) {
		return 1;
	}
	return 1 - target / actual;
}

type Needs = Map<IngredientClass, number>;
function newNeeds(initializer = 0): Needs {
	return new Map([
		['ethanol', initializer],
		['sweetener', initializer],
		['acid', initializer],
		['base', initializer],
		['water', initializer],
	]);
}

function getNeeds(deviations: WorkingTarget, acidGroups: AcidGroups): Needs {
	const scale = 0.5;
	const needs = newNeeds(1);
	const needMore = (key: IngredientClass, howmuchMore: number) => {
		needs.set(key, needs.get(key)! + howmuchMore * scale);
	};
	const needLess = (key: IngredientClass, howmuchLess: number) => {
		needs.set(key, needs.get(key)! - howmuchLess * scale);
	};
	if (deviations.abv > 1) {
		// if we have too much alcohol, we need less ethanol and more water
		needMore('ethanol', deviations.abv);
		needLess('water', deviations.abv);
	} else if (deviations.abv < 1) {
		// if we have too little alcohol, we need more ethanol and less
		// water
		needMore('ethanol', -deviations.abv);
		needLess('water', -deviations.abv);
	}
	if (deviations.brix > 1) {
		// if we have too much sugar, we need less sweetener and more water
		needLess('sweetener', deviations.brix);
		needMore('water', deviations.brix);
	} else if (deviations.brix < 1) {
		// if we have too little sugar, we need more sweetener and less water
		needMore('sweetener', -deviations.brix);
		needLess('water', -deviations.brix);
	}
	const bufferPairs = Array.from(acidGroups.values()).filter((g) => g.conjugateBase);
	if (bufferPairs.length > 0) {
		const acidMass = bufferPairs.reduce((acc, g) => acc + g.acid.mass, 0);
		const baseMass = bufferPairs.reduce((acc, g) => acc + g.conjugateBase!.mass, 0);
		if (deviations.molesH > 1) {
			// if we have too many H+ ions, we are too acidic
			const delta = deviations.molesH * 0.5;
			if (acidMass > baseMass) {
				needMore('base', delta);
			} else {
				needLess('acid', delta);
			}
		} else if (deviations.molesH < 1) {
			// if we have too few H+ ions, we are too basic
			const delta = -deviations.molesH * 0.5;
			if (baseMass > acidMass) {
				needLess('base', delta);
			} else {
				needMore('acid', delta);
			}
		}
	} else if (deviations.molesH > 1) {
		const delta = deviations.molesH * 0.5;
		// if we have too many H+ ions, we need less acid
		needLess('acid', delta);
	} else if (deviations.molesH < 1) {
		const delta = -deviations.molesH * 0.5;
		// if we have too few H+ ions, we need more acid
		needMore('acid', delta);
	}
	return needs;
}

function getMixtureProvides(ingredient: Mixture): Needs {
	const provides = newNeeds(0);
	const substances = ingredient.makeSubstanceMap();
	for (const { mass, item: substance } of substances.values()) {
		for (const [key, value] of getSubstanceProvides(
			substance,
			mass,
			getAcidGroups(ingredient.substances),
		)) {
			provides.set(key, provides.get(key)! + value);
		}
	}

	return provides;
}
function getSubstanceProvides(substance: SubstanceComponent, mass: number, acidGroups: AcidGroups) {
	const provides = newNeeds(0);
	if (substance.substanceId === 'water') {
		provides.set('water', mass);
	} else if (substance.substanceId === 'ethanol') {
		provides.set('ethanol', mass);
	} else if (substance.substance.sweetness > 0) {
		provides.set('sweetener', mass);
	} else if (acidGroups.has(substance.substanceId)) {
		provides.set('acid', mass);
	} else if (
		new FancyIterator(acidGroups.values()).some(
			(v) => v.conjugateBase?.substanceId === substance.substanceId,
		)
	) {
		provides.set('base', mass);
	}

	return provides;
}

export function solver(mixture: Mixture, otargets: SolverTarget) {
	if (otargets.abv !== null && (otargets.abv < 0 || otargets.abv > 100)) {
		throw new Error('Target ABV must be between 0 and 100');
	}
	if (otargets.brix !== null && (otargets.brix < 0 || otargets.brix > 100)) {
		throw new Error('Target Brix must be between 0 and 100');
	}
	if (otargets.pH !== null && (otargets.pH < 0 || otargets.pH > 7)) {
		throw new Error('Target pH must be between 0 and 7');
	}

	const tolerance = 0.0001;

	const targets = targetToWorkingTarget(otargets);

	let bestState = analyze(mixture.clone(), targets);

	const ingredientIds = mixture.ingredientIds;

	const solver: AnnealingSolver<MixtureState, Mixture> = new AnnealingSolver({
		chooseMove: (state, _count) => {
			// given a state, return a candidate move and the error it would cause
			const { mixture } = state;
			// Track best solution
			if (!bestState || state.error < bestState.error) {
				bestState = state;
				if (state.error < tolerance) {
					solver.abort();
				}
			}

			const provisionalMixture = mixture.clone();
			const acidGroups = getAcidGroups(provisionalMixture.substances);
			const needs = getNeeds(state.deviations, acidGroups);
			for (const id of ingredientIds) {
				const ingredient = provisionalMixture.ingredients.get(id)!;
				const currentMass = provisionalMixture.getIngredientMass(id);
				const provides =
					ingredient.item instanceof Mixture
						? getMixtureProvides(ingredient.item)
						: getSubstanceProvides(ingredient.item, currentMass, acidGroups);
				// determine if, on balance, we need more or less of this
				// ingredient based on what we need and what it provides
				let massDelta = 1;
				for (const [key, value] of provides) {
					const need = needs.get(key)!;
					if (value > 0 && need > 0 && need !== 1) {
						massDelta *= need;
					} else if (value > 0 && need < 0) {
						massDelta *= -1 / need;
					}
				}
				// scale the mass of the ingredient
				if (massDelta !== 1) {
					// Scale moves with temperature
					// Larger initial moves, decrease with temperature
					const scaled = 1 + (massDelta - 1) * solver.currentTemperature;
					provisionalMixture.scaleIngredientMass(id, scaled);
				}
			}
			provisionalMixture.setVolume(targets.volume);

			const provisional = analyze(provisionalMixture, targets);

			return { move: provisionalMixture, errorDelta: provisional.error - state.error };
		},
		applyMove(state: MixtureState, move: Mixture): MixtureState {
			return analyze(move, state.targets);
		},
	});
	const result = solver.run(bestState, 100);

	const finalState = bestState?.error < result.state.error ? bestState : result.state;

	if (finalState.error > tolerance * 10) {
		throw new Error('Failed to converge');
	}
	return finalState.mixture;
}

/**
 * Get the mass of a mixture that will result in the target volume
 * of the mixture.
 */
export function solveMassForVolume(mixture: Mixture, targetVolume: number, iteration = 0): number {
	if (targetVolume <= 0) {
		throw new Error('Target volume must be greater than 0');
	}

	const working = mixture.clone();
	const delta = targetVolume - working.volume;
	if (Math.abs(delta) < 0.001) return working.mass;

	// Try simple mass scaling first, but make sure we have a mass to
	// scale
	if (isClose(working.mass, 0, 1e-6)) {
		working.setMass(1);
	}

	const factor = targetVolume / working.volume;
	working.setMass(working.mass * factor);

	// If we hit the target, we're done
	if (isClose(working.volume, targetVolume, 0.001)) return working.mass;

	// If we get here, simple scaling didn't work
	// This likely means we have ethanol + water interaction

	if (iteration < 10) {
		// If we're too small, we need to add more than the simple delta
		// If we're too large, we need to add less than the simple delta
		const adjustmentFactor = delta > 0 ? 1.1 : 0.9;
		return solveMassForVolume(working, targetVolume + delta * adjustmentFactor, iteration + 1);
	}
	return -1;
}

export function isClose(a: number, b: number, delta = 0.01) {
	return Math.abs(a - b) < delta;
}

export function seek(
	mixture: Mixture,
	options: {
		message?: string;
		maxIterations?: number;
		predicate(mx: Mixture): boolean;
		adjuster(mx: Mixture): Mixture;
		throwOnFail?: boolean;
	},
): Mixture {
	if (options.predicate(mixture)) {
		return mixture;
	}
	let iterations = options.maxIterations ?? 100;
	while (iterations-- > 0) {
		const next = options.adjuster(mixture);
		if (options.predicate(next)) {
			return next;
		}
		mixture = next;
	}
	if (options.throwOnFail) {
		throw new Error(`Failed to converge: ${options.message}`);
	}
	return mixture;
}
