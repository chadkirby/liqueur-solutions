import { rollbar } from '$lib/rollbar';
import type { HandleClientError } from '@sveltejs/kit';
import type { ServerInit } from '@sveltejs/kit';
import { dev } from '$app/environment';
import Corbado from '@corbado/web-js';
import { PUBLIC_CORBADO_PROJECT_ID } from '$env/static/public';

export const init: ServerInit = async () => {
	await Corbado.load({
		projectId: PUBLIC_CORBADO_PROJECT_ID,
		frontendApiUrl: dev ? 'http://localhost:5173/auth' : 'auth.liqueur-solutions.com',
		darkMode: 'off',
		isDevMode: dev
	});
};

export const handleError: HandleClientError = ({ error, event }) => {
	rollbar.error('Client error', {
		error,
		url: event.url.pathname
	});

	return {
		message: (error as Error).message
	};
};
