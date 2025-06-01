import type { FileDataV1 } from '$lib/data-format.js';
import { Mixture } from '$lib/mixture.js';
import type { CloudFileData } from '$lib/persistence.svelte.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { userId, bucket } = locals;
	console.log(`[Load] User ID: ${userId}`);
	if (userId && bucket) {
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');

		// List all file objects for this authenticated user from R2.
		const options = { prefix: `files/${safeId}/`, include: ['customMetadata'] } as const;
		const listed = await bucket.list(options);
		let truncated = listed.truncated;
		let cursor = listed.truncated ? listed.cursor : undefined;

		if (listed.truncated) {
			while (truncated) {
				const next = await bucket.list({
					...options,
					cursor: cursor,
				});
				listed.objects.push(...next.objects);

				truncated = next.truncated;
				cursor = next.truncated ? next.cursor : undefined;
			}
		}

		const cloudFiles: CloudFileData[] = [];
		for (const item of listed.objects) {
			try {
				const file = await bucket.get(item.key);
				if (!file) {
					console.log(`[Mixtures] No file found for id: ${item.key}`);
					continue; // Skip to the next item if file not found
				}

				const fileData = (await file.json()) as FileDataV1;
				cloudFiles.push({
					id: fileData.id,
					name: fileData.name,
					accessTime: file.uploaded.toISOString(),
					desc: fileData.desc,
					_ingredientHash: ensureIngredientHash(fileData),
				});
			} catch (fileErr) {
				// Log error for this specific file but continue processing others
				console.error(`[Mixtures] Error processing file ${item.key}:`, fileErr);
				// Don't rethrow - we want to continue with other files
			}
		}

		console.log(
			`[Load] Found starred ids for user ${userId}:`,
			cloudFiles.map((f) => f.id),
		);

		return { cloudFiles };
	}
	return {
		cloudFiles: [],
	};
};

function ensureIngredientHash(data: FileDataV1): string {
	if (data._ingredientHash) return data._ingredientHash;
	// If _ingredientHash is not present, calculate it from the mixture
	// (which should have an ingredientDb array, but there are a few files
	// out there with ingredientJSON instead from a brief period when we
	// were using tinybase)
	const db = data.ingredientDb ?? JSON.parse((data as any).ingredientJSON);
	const mixture = Mixture.deserialize(data.rootMixtureId, db);
	return mixture.getIngredientHash(data.name);
}
