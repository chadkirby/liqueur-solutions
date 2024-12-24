import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getR2Bucket } from '$lib/r2';

export async function POST({ request, platform, locals }: RequestEvent) {
	if (!platform) {
		// testing
		return json({ ok: true });
	}

	const push = await request.json();
	const bucket = getR2Bucket(platform);
	const userId = locals.userId; // Get from Corbado session

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	// Process each mutation in the push
	for (const mutation of push.mutations) {
		const { id, name, args } = mutation;

		try {
			switch (name) {
				case 'createFile':
				case 'updateFile': {
					const item = args;
					await bucket.put(`files/${userId}/${item.id}`, JSON.stringify(item));
					break;
				}
				case 'deleteFile': {
					const id = args;
					await bucket.delete(`files/${userId}/${id}`);
					// Also delete any star for this file
					await bucket.delete(`stars/${userId}/${id}`);
					break;
				}
				case 'addStar': {
					const id = args;
					await bucket.put(`stars/${userId}/${id}`, JSON.stringify(true));
					break;
				}
				case 'deleteStar': {
					const id = args;
					await bucket.delete(`stars/${userId}/${id}`);
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
