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
	mass: number;
};

// add in-memory item to the data
export type IngredientItem = IngredientItemData & {
	// id: string;
	// name: string;
	// mass: number;
	item: IngredientItemComponent; // Mixture | SubstanceComponent;
};

// make id optional for adding new items
export type IngredientToAdd = Omit<IngredientItem, 'id'> & {
	id?: string;
	// name: string;
	// mass: number;
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

export const storedFileDataVersion = 1;

/**
 * FileItem represents a stored mixture file. All types must be
 * compatible with Replicache's ReadonlyJSONValue.
 */
export type StoredFileData = {
	version: typeof storedFileDataVersion;
	id: string;
	name: string;
	accessTime: number;
	desc: string;
	mixture: MixtureData;
	ingredientDb: IngredientDbData;
};

export function isVersion1Data(data: unknown): boolean {
	if (typeof data !== 'object' || data === null) {
		return false;
	}
	if ('version' in data && typeof data.version === 'number') {
		return data.version === 1;
	}
	// else duck-typing
	if (
		'id' in data &&
		typeof data.id === 'string' &&
		'name' in data &&
		typeof data.name === 'string' &&
		'accessTime' in data &&
		typeof data.accessTime === 'number' &&
		'desc' in data &&
		typeof data.desc === 'string' &&
		'mixture' in data &&
		'ingredientDb' in data
	) {
		return true;
	}
	return false;
}

/*
v0 data:
{
  "name": "Boozy Mixture",
  "data": {
      "type": "mixture",
      "components": [
          {
              "name": "",
              "id": "spirit",
              "data": {
                  "type": "mixture",
                  "components": [
                      {
                          "name": "ethanol",
                          "id": "yj903ezrsu",
                          "data": {
                              "type": "ethanol",
                              "volume": 80.01572657868589
                          }
                      },
                      {
                          "name": "water",
                          "id": "ewv89fnnx2h",
                          "data": {
                              "type": "water",
                              "volume": 119.98427342131413
                          }
                      }
                  ]
              }
          },
          {
              "name": "",
              "id": "water",
              "data": {
                  "type": "water",
                  "volume": 100
              }
          },
          {
              "name": "",
              "id": "sugar",
              "data": {
                  "type": "sweetener",
                  "subType": "sucrose",
                  "mass": 50
              }
          }
      ]
  }
} */
export type StoredFileDataV0 = {
	name: string;
	data: {
		type: 'mixture';
		components: Array<{
			name: string;
			id: string;
			data: {
				type: 'mixture';
				components: Array<{
					name: string;
					id: string;
					data: {
						type: string;
						volume: number;
					};
				}>;
			};
		}>;
	};
};
