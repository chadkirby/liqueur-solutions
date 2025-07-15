import { error } from '@sveltejs/kit';
import { getDB } from '$lib/cf-bindings.js';
import { getMixture, getAllIngredients } from '$lib/api-utils.js';
import type { ServerLoadData } from './types.js';

export const load = async ({ params, platform, locals }: {
	params: { id: string };
	platform?: any;
	locals: { userId?: string };
}): Promise<ServerLoadData> => {
	if (!params.id) {
		throw error(400, 'No mixture ID provided');
	}

	const storeId = params.id;

	// Early return if no platform or user (development mode or unauthenticated)
	if (!platform || !locals.userId) {
		return {
			storeId,
			serverMixture: null,
			serverIngredients: null,
		};
	}

	try {
		const d1 = getDB(platform);

		// Fetch mixture and ingredients in parallel
		const [mixtureResult, ingredientsResult] = await Promise.allSettled([
			getMixture(d1, { userId: locals.userId, mxId: storeId }),
			getAllIngredients(d1, { userId: locals.userId, mxId: storeId })
		]);

		const serverMixture = mixtureResult.status === 'fulfilled' && mixtureResult.value.success
			? mixtureResult.value.data
			: null;

		const serverIngredients = ingredientsResult.status === 'fulfilled'
			? ingredientsResult.value
			: null;

		return {
			storeId,
			serverMixture,
			serverIngredients,
		};
	} catch (err) {
		console.warn('Failed to fetch server data for mixture:', storeId, err);
		// Don't throw - gracefully degrade to client-only mode
		return {
			storeId,
			serverMixture: null,
			serverIngredients: null,
		};
	}
};
