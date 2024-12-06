import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Required: tells Vite to create source maps
		sourcemap: true
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
