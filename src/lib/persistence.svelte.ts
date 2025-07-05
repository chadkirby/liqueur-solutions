import { Mixture } from './mixture.js';
import { type FileDataV2, type IngredientItemData } from '$lib/data-format.js';

export function deserialize(item: FileDataV2, ingredients: IngredientItemData[]): FileDataV2 {
	// make sure we have a valid ingredientHash (older files might not have it)
	const _ingredientHash =
		item._ingredientHash ??
		Mixture.deserialize(item.rootIngredientId, ingredients).getIngredientHash(item.name);

	// Ensure accessTime is a valid ISO string
	const accessTime = new Date(item.accessTime).toISOString();

	const copy = { ...item };
	delete (copy as any).ingredientJSON; // remove old field if it exists

	return {
		...copy,
		accessTime,
		_ingredientHash,
	} as const;
}
