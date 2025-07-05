/**
 * Server-side endpoint for manipulating stars.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/cf-bindings.js';

export const GET: RequestHandler = async ({ params, platform, locals }: RequestEvent) => {
	if (!platform) {
		// Development mode: no R2 available, return empty patch
		throw error(500, 'R2 not available in development mode');
	}
	const bucket = getR2Bucket(platform);
	const userId = locals.userId; // Populated by Clerk middleware

	if (!userId) {
		// Unauthenticated: no data
		throw error(401, 'Unauthorized');
	}
	// Sanitize userId for safe inclusion in R2 object keys: only alphanumeric and underscore.
	const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_');
	const prefix = `stars/${safeId}/`;

	// Authenticated user: fetch data from R2,
	try {
		// get the requested file for this authenticated user from R2.
		const listedStars = await bucket.list({ prefix });

		let truncated = listedStars.truncated;
		let cursor = listedStars.truncated ? listedStars.cursor : undefined;

		while (truncated) {
			const next = await bucket.list({
				prefix,
				cursor,
			});
			listedStars.objects.push(...next.objects);

			truncated = next.truncated;
			cursor = next.truncated ? next.cursor : undefined;
		}

		// return the list of stars
		const stars = listedStars.objects
			.filter((obj) => obj.key.startsWith(prefix))
			.map((obj) => {
				const id = obj.key.split('/').pop()!;
				return { id };
			});

		console.log(`[Stars] Found ${stars.length} stars for user ${prefix}`);
		return json(stars);
	} catch (err: any) {
		// Explicitly type err
		console.error(`[Pull] Error processing list:`, err.message, err);
		// Even in case of error generating patch, try to send the LMI
		throw error(500, `Failed to process pull: ${err.message}`);
	}
};
