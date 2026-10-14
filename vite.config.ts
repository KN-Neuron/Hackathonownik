import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		global: 'globalThis'
	},
	server: {
		allowedHosts: true
	},
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},
			{
				// Needs a running app and PocketBase: see tests/e2e/README.md (npm run test:e2e)
				extends: './vite.config.ts',
				test: {
					name: 'e2e',
					environment: 'node',
					include: ['tests/e2e/**/*.spec.ts'],
					testTimeout: 60_000,
					hookTimeout: 120_000,
					fileParallelism: false
				}
			}
		]
	}
});
