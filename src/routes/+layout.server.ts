import type { FileSyncMeta } from '$lib/data-format.js';
import type { StorageId } from '$lib/storage-id.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { userId, bucket } = locals;
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

		const syncMeta: FileSyncMeta[] = listed.objects.map((item) => ({
			id: item.key.split('/').pop()! as StorageId, // Use the file name as the ID
			lastSyncHash: item.customMetadata?.ingredientHash || '',
			lastSyncTime: Number(item.uploaded),
		}));
		console.log(`[Load] Found starred ids for user ${userId}:`, syncMeta);

		return { syncMeta };
	}
	return {
		syncMeta: [],
	};
};
