import { SubstanceComponent } from './ingredients/substance-component.js';
import { type SubstanceId } from './ingredients/substances.js';
import type { Mixture } from './mixture.js';
import { z } from 'zod/v4-mini';

/*
 * A SubstanceComponent has no inherent mass. It just provides
 * convenience methods for accessing the underlying substance data.
 *
 * A Mixture is a collection of ingredients particular quantities of
 * particular ingredients. A Mixture has a mass, f
 */

/** common interface that IngredientItemComponents must implement */
export interface CommonComponent {
	describe(): string;
	readonly isValid: boolean;
	label: string;
	referenceMass: number;
}

/** Mixture and SubstanceComponent implement CommonComponent */
export type InMemoryIngredientItem = Mixture | SubstanceComponent;

export const zIngredientMeta = z.object({
	id: z.string(),
	name: z.string(),
	mass: z.number(),
});

export type IngredientMeta = z.infer<typeof zIngredientMeta>;

export type InMemoryIngredient = IngredientMeta & {
	item: Mixture | SubstanceComponent;
};
export type InMemorySubstance = IngredientMeta & {
	item: SubstanceComponent;
};
export type InMemoryMixture = IngredientMeta & {
	item: Mixture;
};

export type IngredientToAdd = Omit<IngredientMeta, 'id'> & {
	id?: string; // Optional for new items
	item: Mixture | SubstanceComponent;
};

export type DecoratedSubstance = Readonly<{
	mass: number;
	substanceId: SubstanceId;
	ingredientId: string;
	mixtureId: string;
	item: SubstanceComponent;
}>;

export type DecoratedIngredient = Readonly<{
	ingredient: InMemoryIngredient;
	mass: number;
}>;

// Data types

export interface SolverTarget {
	/** between 0-100 */
	abv: number;
	/** between 0-100 */
	brix: number;
	/** between 0-Infinity */
	volume: number;
	/** between 0-7 */
	pH: number;
}

export type EditableProperty = keyof SolverTarget | 'mass';

export type MixtureAnalysis = SolverTarget & {
	mass: number;
	kcal: number;
	proof: number;
	equivalentSugarMass: number;
	pH: number;
};
