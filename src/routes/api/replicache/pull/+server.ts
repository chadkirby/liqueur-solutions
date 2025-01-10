import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';

export async function POST({ request, platform }: RequestEvent) {
	if (!platform) {
		throw error(401, 'Unauthorized');
	}
	const pull = await request.json();
	const bucket = getR2Bucket(platform);

	try {
		// List all objects in the files space
		const objects = await bucket.list({ prefix: 'files/' });
		const items = [];

		// Get each object's content
		for (const obj of objects.objects) {
			const content = await bucket.get(obj.key);
			if (content) {
				items.push({
					key: obj.key,
					value: await content.json()
				});
			}
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
