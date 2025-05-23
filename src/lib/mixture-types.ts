import type { SubstanceComponent } from './ingredients/substance-component.js';
import type { SubstanceId } from './ingredients/substances.js';
import type { Mixture } from './mixture.js';

/*
 * A SubstanceComponent has no inherent mass. It just provides
 * convenience methods for accessing the underlying substance data.
 *
 * A Mixture is a collection of ingredients particular quantities of particular ingredients. A Mixture has a mass, f
 */

/** common interface that IngredientItemComponents must implement */
export interface CommonComponent {
	describe(): string;
	readonly isValid: boolean;
	label: string;
	referenceMass: number;
}

/** Mixture and SubstanceComponent implement CommonComponent */
export type IngredientItemComponent = Mixture | SubstanceComponent;

type IngredientItemData = {
	id: string;
	name: string;
	mass: number;
	notes?: string; // Optional notes field
};

// add in-memory item to the data
export type IngredientItem = IngredientItemData & {
	// id: string;
	// name: string;
	// mass: number;
	// notes?: string;
	item: IngredientItemComponent; // Mixture | SubstanceComponent;
};

export type IngredientSubstanceItem = IngredientItemData & {
	// id: string;
	// name: string;
	// mass: number;
	item: SubstanceComponent;
};

// make id optional for adding new items
export type IngredientToAdd = Omit<IngredientItem, 'id'> & {
	id?: string;
	// name: string;
	// mass: number;
	// item: IngredientItemComponent; // Mixture | SubstanceComponent;
};

export type DecoratedSubstance = Readonly<{
	mass: number;
	substanceId: SubstanceId;
	ingredientId: string;
	mixtureId: string;
	item: SubstanceComponent;
}>;

export type DecoratedIngredient = Readonly<{
	ingredient: IngredientItem;
	mass: number;
}>;

// Data types

export type MixtureData = Readonly<{
	id: string;
	ingredients: Array<IngredientItemData>;
}>;

export type SubstanceData = Readonly<{
	id: SubstanceId;
}>;

export function isMixtureData(data: IngredientData): data is MixtureData {
	return 'ingredients' in data;
}

export function isSubstanceData(data: IngredientData): data is SubstanceData {
	return !isMixtureData(data);
}

export type IngredientData = MixtureData | SubstanceData;

// serialized Map<string, IngredientData>
export type IngredientDbData = Array<[string, IngredientData]>;

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
