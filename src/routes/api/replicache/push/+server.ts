import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';

export async function POST({ request, platform }: RequestEvent) {
	if (!platform) {
		throw error(401, 'Unauthorized');
	}
	const push = await request.json();
	const bucket = getR2Bucket(platform);

	// Process each mutation in the push
	for (const mutation of push.mutations) {
		const { id, name, args } = mutation;

		try {
			switch (name) {
				case 'createFile':
				case 'updateFile': {
					const item = args;
					await bucket.put(`files/${item.id}`, JSON.stringify(item));
					break;
				}
				case 'deleteFile': {
					const id = args;
					await bucket.delete(`files/${id}`);
					break;
				}
				default:
					throw error(400, `Unknown mutation: ${name}`);
			}
		} catch (err) {
			console.error('Push error:', err);
			throw error(500, 'Failed to process mutation');
		}
	}

	return json({ ok: true });
}
