import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// SvelteKit adds a nonce to its own inline scripts, so scripts need neither
		// 'unsafe-inline' nor 'unsafe-eval'. Styles still allow inline (Svelte sets style attributes).
		csp: {
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'https:'],
				'font-src': ['self', 'data:', 'https:'],
				'connect-src': [
					'self',
					'https://hotb-pb.knneuron.pl',
					...(process.env.NODE_ENV === 'production'
						? []
						: ['ws://localhost:*', 'http://127.0.0.1:*'])
				],
				// Embedded demo videos on the jury view
				'frame-src': ['self', 'https://www.youtube-nocookie.com', 'https://www.loom.com'],
				'frame-ancestors': ['none'],
				'base-uri': ['self'],
				'form-action': ['self']
			}
		}
	}
};

export default config;
