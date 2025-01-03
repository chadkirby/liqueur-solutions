import { Mixture } from './mixture.js';
import { SubstanceComponent } from './ingredients/substance-component.js';
import { AnnealingSolver } from 'abstract-sim-anneal';
import { isAcidId, isSweetenerId } from './ingredients/substances.js';

type IngredientClass = 'ethanol' | 'sweetener' | 'acid' | 'water';

export interface Target {
	/** between 0-100 */
	abv: number;
	/** between 0-100 */
	brix: number;
	/** between 0-Infinity */
	volume: number;
	/** between 0-7 */
	pH: number;
}

interface MixtureState {
	mixture: Mixture;
	targets: Target;
	actual: Target;
	/** deviation from target values as a percentage of the target value
	 * between -1, 1 */
	deviations: Target;
	/** total deviation from target values */
	error: number;
}

export function analyze(mixture: Mixture, targets: Target): MixtureState {
	if (targets.pH === 0) {
		throw new Error('Target pH must be between 0 and 7');
	}
	if (targets.volume === 0) {
		throw new Error('Target volume must be greater than 0');
	}

	const actual: Target = {
		abv: mixture.abv,
		brix: mixture.brix,
		pH: mixture.pH,
		volume: mixture.volume,
	};
	// determine the deviation from the target values as a percentage
	const deviations = {
		abv: getDeviation(actual.abv, targets.abv),
		brix: getDeviation(actual.brix, targets.brix),
		pH: getDeviation(actual.pH, targets.pH),
		volume: getDeviation(actual.volume, targets.volume),
	};

	return {
		mixture,
		targets,
		actual,
		deviations,
		error: totalDeviation(deviations),
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
	return (actual - target) / actual;
}

function totalDeviation(deviations: Target): number {
	return Math.sqrt(
		deviations.abv ** 2 + deviations.brix ** 2 + deviations.pH ** 2 + deviations.volume ** 2,
	);
}
type Needs = Map<IngredientClass, number>;
function newNeeds(initializer = 0): Needs {
	return new Map([
		['ethanol', initializer],
		['sweetener', initializer],
		['acid', initializer],
		['water', initializer],
	]);
}

function getNeeds(deviations: Target): Needs {
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
	if (deviations.pH > 1) {
		// if we have too high pH, we need more acid
		needMore('acid', deviations.pH);
	} else if (deviations.pH < 1) {
		// if we have too low pH, we need less acid
		needLess('acid', -deviations.pH);
	}

	return needs;
}

function getMixtureProvides(ingredient: Mixture): Needs {
	const provides = newNeeds(0);
	const substances = ingredient.makeSubstanceMap();
	for (const { mass, component } of substances.values()) {
		for (const [key, value] of getSubstanceProvides(component, mass)) {
			provides.set(key, provides.get(key)! + value);
		}
	}

	return provides;
}
function getSubstanceProvides(ingredient: SubstanceComponent, mass: number) {
	const provides = newNeeds(0);
	if (ingredient.substanceId === 'water') {
		provides.set('water', mass);
	} else if (ingredient.substanceId === 'ethanol') {
		provides.set('ethanol', mass);
	} else if (isSweetenerId(ingredient.substanceId)) {
		provides.set('sweetener', mass);
	} else if (isAcidId(ingredient.substanceId)) {
		provides.set('acid', mass);
	}

	return provides;
}

export function solver(mixture: Mixture, targets: Target) {
	if (targets.abv !== null && (targets.abv < 0 || targets.abv > 100)) {
		throw new Error('Target ABV must be between 0 and 100');
	}
	if (targets.brix !== null && (targets.brix < 0 || targets.brix > 100)) {
		throw new Error('Target Brix must be between 0 and 100');
	}
	if (targets.pH !== null && (targets.pH < 0 || targets.pH > 7)) {
		throw new Error('Target pH must be between 0 and 7');
	}

	const tolerance = 0.0001;

	let bestState = analyze(mixture.clone(false), targets);

	const ingredientIds = [...mixture.eachIngredientId()];

	const solver: AnnealingSolver<MixtureState, Mixture> = new AnnealingSolver({
		chooseMove: (state, count) => {
			// given a state, return a candidate move and the error it would cause
			const { mixture } = state;
			// Track best solution
			if (!bestState || state.error < bestState.error) {
				bestState = state;
				if (state.error < tolerance) {
					console.log('Aborting early', count);
					console.log(state.actual);
					console.log(state.deviations);
					console.log(state.error);
					solver.abort();
				}
			}

			const needs = getNeeds(state.deviations);

			const provisionalMixture = mixture.clone(false);
			for (const id of ingredientIds) {
				const ingredient = provisionalMixture.ingredients.get(id)!;
				const currentMass = provisionalMixture.getIngredientMass(id);
				const provides =
					ingredient.component instanceof Mixture
						? getMixtureProvides(ingredient.component)
						: getSubstanceProvides(ingredient.component, currentMass);
				// determine if, on balance, we need more or less of this
				// ingredient based on what we need and what it provides
				let massDelta = 1;
				for (const [key, value] of provides) {
					const need = needs.get(key)!;
					if (value > 0 && need > 0 && need !== 1) {
						massDelta *= need;
					}
				}
				// scale the mass of the ingredient
				if (massDelta !== 1) {
					// Scale moves with temperature
					// Larger initial moves, decrease with temperature
					const moveScale = 1 * solver.currentTemperature;
					const scaled = 1 + (massDelta - 1) * moveScale;
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

	if (finalState.error > tolerance) {
		throw new Error('Failed to converge');
	}
	return finalState.mixture;
}

export function setVolume(working: Mixture, targetVolume: number, iteration = 0): void {
	if (targetVolume <= 0) {
		working.setMass(0);
		return;
	}

	if (isClose(targetVolume, working.volume, 0.001)) return;

	// Try simple mass scaling first, but make sure we have a mass to
	// scale
	if (working.mass <= 0) {
		working.setMass(1);
	}

	const factor = targetVolume / working.volume;
	working.setMass(working.mass * factor);

	// If we hit the target, we're done
	if (isClose(working.volume, targetVolume, 0.001)) return;

	// If we get here, simple scaling didn't work
	// This likely means we have ethanol + water interaction
	const delta = targetVolume - working.volume;

	if (iteration < 10) {
		// If we're too small, we need to add more than the simple delta
		// If we're too large, we need to add less than the simple delta
		const adjustmentFactor = delta > 0 ? 1.1 : 0.9;
		return setVolume(working, targetVolume + delta * adjustmentFactor, iteration + 1);
	}
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
