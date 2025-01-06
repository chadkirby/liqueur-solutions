import type { SubstanceComponent } from './ingredients/substance-component.js';
import type { Mixture } from './mixture.js';
import type { SubstanceId } from './ingredients/substances.js';

/*
 * A SubstanceComponent has no inherent mass. It just provides
 * convenience methods for accessing the underlying substance data.
 *
 * A Mixture is a collection of ingredients particular quantities of particular ingredients. A Mixture has a mass, f
 */

/** common interface that IngredientItemComponents must implement */
export interface CommonComponent {
	describe(): string;
	toStorageData(): IngredientData;
	readonly isValid: boolean;
	label: string;
	referenceMass: number;
}

/** Mixture and SubstanceComponent implement CommonComponent */
export type IngredientItemComponent = Mixture | SubstanceComponent;

type IngredientItemData = {
	id: string;
	name: string;
	desiredMass: number;
};

// add in-memory item to the data
export type IngredientItem = IngredientItemData & {
	// id: string;
	// name: string;
	// desiredMass: number;
	item: IngredientItemComponent; // Mixture | SubstanceComponent;
};

// make id optional for adding new items
export type IngredientToAdd = Omit<IngredientItem, 'id'> & {
	id?: string;
	// name: string;
	// desiredMass: number;
	// item: IngredientItemComponent; // Mixture | SubstanceComponent;
};

export type DecoratedSubstance = {
	mass: number;
	substanceId: SubstanceId;
	ingredientId: string;
	item: SubstanceComponent;
};

export type DecoratedIngredient = {
	ingredient: IngredientItem;
	mass: number;
};

// Data types

export type MixtureData = {
	id: string;
	ingredients: Array<IngredientItemData>;
};

export type SubstanceData = {
	id: SubstanceId;
};

export function isMixtureData(data: IngredientData): data is MixtureData {
	return 'ingredients' in data;
}

export function isSubstanceData(data: IngredientData): data is SubstanceData {
	return !isMixtureData(data);
}

export type IngredientData = MixtureData | SubstanceData;

// serialized Map<string, IngredientData>
export type IngredientDbData = Array<[string, IngredientData]>;

/**
 * FileItem represents a stored mixture file. All types must be
 * compatible with Replicache's ReadonlyJSONValue.
 */
export type StoredFileData = {
	id: string;
	name: string;
	accessTime: number;
	desc: string;
	mixture: MixtureData;
	ingredientDb: IngredientDbData;
};
