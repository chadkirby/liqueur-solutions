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
	const userId = locals.userId; // Get from Corbado session

	if (!userId) {
		// Return empty response for unauthenticated users
		return json({
			lastMutationID: pull.lastMutationID,
			cookie: Date.now(),
			patch: []
		});
	}

	try {
		const items = [];

		// List user's files
		const files = await bucket.list({ prefix: `files/${userId}/` });
		for (const obj of files.objects) {
			const content = await bucket.get(obj.key);
			if (content) {
				items.push({
					key: obj.key.replace(`files/${userId}/`, 'files/'), // Strip user ID from key
					value: await content.json()
				});
			}
		}

		// List user's stars
		const stars = await bucket.list({ prefix: `stars/${userId}/` });
		for (const obj of stars.objects) {
			items.push({
				key: obj.key.replace(`stars/${userId}/`, 'stars/'), // Strip user ID from key
				value: true
			});
		}

		return json({
			lastMutationID: pull.lastMutationID,
			cookie: Date.now(),
			patch: items
		});
	} catch (err) {
		console.error('Pull error:', err);
		throw error(500, 'Failed to process pull');
	}
}
