import { Mixture } from './mixture.js';
import { type FileDataV1, type IngredientDbEntry } from '$lib/data-format.js';

export function deserialize(item: FileDataV1): FileDataV1 {
	// some interim files have ingredientJSON instead of ingredientDb
	const ingredientDb: IngredientDbEntry[] =
		'ingredientJSON' in item ? JSON.parse(item.ingredientJSON as string) : item.ingredientDb;
	// make sure we have a valid ingredientHash (older files might not have it)
	const _ingredientHash =
		item._ingredientHash ??
		Mixture.deserialize(item.rootMixtureId, ingredientDb).getIngredientHash(item.name);

	// Ensure accessTime is a valid ISO string
	const accessTime = new Date(item.accessTime).toISOString();

	const copy = { ...item };
	delete (copy as any).ingredientJSON; // remove old field if it exists

	return {
		...copy,
		accessTime,
		ingredientDb: [...ingredientDb],
		_ingredientHash,
	} as const;
}
