import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';

/**
 * Vite configuration.
 *
 * @see https://vitest.dev/config
 */
export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	build: {
		// Required: tells Vite to create source maps
		sourcemap: true
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.svelte.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./vitest-setup.js']
	},
	// Tell Vitest to use the `browser` entry points in `package.json` files, even though it's running in Node
	resolve: process.env.VITEST
		? {
				conditions: ['browser']
			}
		: undefined
});
