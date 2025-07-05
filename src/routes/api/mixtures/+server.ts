/**
 * Server-side endpoint for listing a user's files.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/cf-bindings.js';
import { type FileDataV2 } from '$lib/data-format.js';
import { readMixtureObject } from '../api-utils.js';

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!platform) {
		// Development mode: no R2 available
		console.log(`[Pull-Dev] DEV MODE. Returning empty patch and LMI 0.`);
		throw error(500, 'R2 not available in development mode');
	}
	const bucket = getR2Bucket(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		// Unauthenticated: no data
		console.log(`[Mixtures] Unauthenticated access attempt. Returning empty patch and LMI 0.`);
		throw error(401, 'Unauthorized');
	}

	// Authenticated user: fetch data from R2
	try {
		// Only fetch and create patch if the version changed
		// Sanitize userId for safe inclusion in R2 object keys: only alphanumeric and underscore.
		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');

		// List all file objects for this authenticated user from R2 and return as array
		const prefix = `files/${safeId}/`;
		const listedFiles = await bucket.list({
			prefix,
			// include: ['customMetadata'],
		});

		let truncated = listedFiles.truncated;
		let cursor = listedFiles.truncated ? listedFiles.cursor : undefined;

		while (truncated) {
			const next = await bucket.list({
				prefix,
				cursor,
				// include: ['customMetadata'],
			});
			listedFiles.objects.push(...next.objects);

			truncated = next.truncated;
			cursor = next.truncated ? next.cursor : undefined;
		}

		console.log(`[Mixtures] Found ${listedFiles.objects.length} files for user ${userId}`);

		const result: FileDataV2[] = [];

		for (const item of listedFiles.objects) {
			const obj = await readMixtureObject(bucket, item.key);
			if (obj === 404) {
				continue;
			}
			if (!obj.success) {
				console.error(
					`[Mixtures] Invalid data for id: ${item.key}. Issues: ${obj.error.issues
						.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
						.join(', ')}`,
				);
				continue; // Skip invalid objects
			}

			result.push(obj.data);
		}

		return json(result);
	} catch (err: any) {
		// Explicitly type err
		console.error(`[Mixtures] Error processing list:`, err.message, err);
		// Even in case of error generating patch, try to send the LMI
		throw error(500, `Failed to process pull: ${err.message}`);
	}
};
