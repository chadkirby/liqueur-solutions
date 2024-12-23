import type { Handle, HandleServerError } from '@sveltejs/kit';
import { Config, SDK } from '@corbado/node-sdk';
import { PUBLIC_CORBADO_PROJECT_ID } from '$env/static/public';
import { CORBADO_API_SECRET } from '$env/static/private';

// Initialize Corbado SDK
const config = new Config(
	PUBLIC_CORBADO_PROJECT_ID,
	CORBADO_API_SECRET,
	`https://${PUBLIC_CORBADO_PROJECT_ID}.frontendapi.corbado.io`,
	'https://backendapi.cloud.corbado.io'
);
const corbadoSDK = new SDK(config);

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('cbo_session_token');

	if (sessionToken) {
		try {
			const user = await corbadoSDK.sessions().validateToken(sessionToken);
			// Store the user ID in event.locals
			event.locals.userId = user.userId;
		} catch (error) {
			console.error('Failed to verify Corbado session:', error);
		}
	}

	return await resolve(event);
};

export const handleError: HandleServerError = ({ error, event }) => {
	const e = error as Error;
	// Log to Cloudflare's built-in logging
	console.error('Server error:', {
		message: e.message,
		stack: e.stack,
		url: event.url.pathname,
		method: event.request.method
	});

	return {
		message: (error as Error).stack ?? (error as Error).message
	};
};
