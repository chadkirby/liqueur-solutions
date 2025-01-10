import { dev } from '$app/environment';
import Corbado from '@corbado/web-js';
import { PUBLIC_CORBADO_PROJECT_ID } from '$env/static/public';

export type { SessionUser } from '@corbado/types';

let isLoaded = false;
export async function loadCorbado() {
	if (isLoaded) return Corbado;

	await Corbado.load({
		projectId: PUBLIC_CORBADO_PROJECT_ID,
		frontendApiUrl: dev ? 'http://localhost:5173/auth' : 'auth.liqueur-solutions.com',
		darkMode: 'off',
		isDevMode: dev
	});
	isLoaded = true;
	return Corbado;
}
