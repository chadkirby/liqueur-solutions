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
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./vitest-setup.js']
	}
});
