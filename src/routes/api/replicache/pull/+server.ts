import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';

export async function POST({ request, platform, locals }: RequestEvent) {
	if (!platform) {
		// testing
		return json({ lastMutationID: 0, cookie: Date.now(), patch: [] });
	}

	const pull = await request.json();
	const bucket = getR2Bucket(platform);
	const userId = locals.auth.userId; // Get from Clerk session

	if (!userId) {
		// Return empty response for unauthenticated users
		return json({
			lastMutationID: pull.lastMutationID,
			cookie: Date.now(),
			patch: [],
		});
	}

	try {
		const items = [];

		const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_'); // Safe for use in key

		// List user's files
		const files = await bucket.list({ prefix: `files/${safeId}/` });
		for (const obj of files.objects) {
			const content = await bucket.get(obj.key);
			if (content) {
				items.push({
					key: obj.key.replace(`files/${safeId}/`, 'files/'), // Strip user ID from key
					value: await content.json(),
				});
			}
		}

		// List user's stars
		const stars = await bucket.list({ prefix: `stars/${safeId}/` });
		for (const obj of stars.objects) {
			items.push({
				key: obj.key.replace(`stars/${safeId}/`, 'stars/'), // Strip user ID from key
				value: true,
			});
		}

		return json({
			lastMutationID: pull.lastMutationID,
			cookie: Date.now(),
			patch: items,
		});
	} catch (err) {
		console.error('Pull error:', err);
		throw error(500, 'Failed to process pull');
	}
}
