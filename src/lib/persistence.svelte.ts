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

export async function runJanitor(stars: Set<string>): Promise<void> {
	if (!MixtureFiles) return;
	const aMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
	try {
		const files = MixtureFiles.find({ accessTime: { $lt: aMonthAgo } }, { fields: { id: 1 } });
		files.forEach(({ id }) => {
			if (!stars.has(id)) {
				MixtureFiles.removeOne({ id });
			}
		});
	} catch (e) {
		console.error('FilesDb janitor error', e);
	}
}
