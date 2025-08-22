import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csp: {
			directives: {
				'script-src': ['self']
			},
			reportOnly: {
				'script-src': ['self'],
				'report-uri': ['/']
			}
		}
		// vite: {
		// 	resolve: {
		// 		alias: {
		// 			'@': path.resolve('src')
		// 		}
		// 	}
		// }
	}
};

export default config;
