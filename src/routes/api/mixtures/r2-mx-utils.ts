import {
	getIngredientHash,
	getMixtureListMetadata,
	zFileDataV1,
	type FileDataV1,
} from '$lib/data-format.js';
import type { R2Bucket, R2Object } from '$lib/r2.js';
import type { ZodError } from 'zod/v4';

export async function writeMixtureObject(
	bucket: R2Bucket,
	key: string,
	mxData: FileDataV1,
): Promise<R2Object | null> {
	return bucket.put(key, JSON.stringify(mxData), {
		customMetadata: getMixtureListMetadata(mxData),
	});
}

export async function readMixtureObject(
	bucket: R2Bucket,
	key: string,
): Promise<
	{ success: true; data: FileDataV1 } | { success: false; error: ZodError<FileDataV1> } | 404
> {
	const file = await bucket.get(key);
	if (!file) {
		console.log(`[Mixtures] No file found for id: ${key}`);
		return 404;
	}
	const { ingredientJSON, ...rawData } = (await file.json()) as Record<string, unknown>;

	let parsedData = zFileDataV1.safeParse({
		...rawData,
	});
	if (!parsedData.success) {
		const hasIssue = (path: string) =>
			parsedData.error!.issues.some((issue) => issue.path.includes(path));
		const curedData = {
			...(hasIssue('accessTime') ? { accessTime: file.uploaded.toISOString() } : undefined),
			...(hasIssue('_ingredientHash') ? { _ingredientHash: '<hash>' } : undefined),
		};
		// If we have cured data, try to parse again
		if (Object.keys(curedData).length > 0) {
			parsedData = zFileDataV1.safeParse({
				...rawData,
				...curedData,
			});
		}
		if (!parsedData.success) {
			return parsedData as { success: false; error: ZodError<FileDataV1> };
		}
	}
	if (parsedData.success && parsedData.data._ingredientHash === '<hash>') {
		// If the hash is not set, we need to calculate it from the
		// ingredients
		parsedData.data._ingredientHash = getIngredientHash(parsedData.data);
	}
	return parsedData;
}
