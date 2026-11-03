import { describe, expect, it } from 'vitest';
import { toEmbedUrl } from './videoEmbed';

describe('toEmbedUrl', () => {
	it.each([
		[
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
		],
		['https://youtu.be/dQw4w9WgXcQ?si=abc', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
		[
			'https://m.youtube.com/shorts/dQw4w9WgXcQ',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
		],
		['https://www.loom.com/share/abc123def', 'https://www.loom.com/embed/abc123def']
	])('embeds %s', (link, expected) => {
		expect(toEmbedUrl(link)).toBe(expected);
	});

	it.each([
		'https://vimeo.com/123',
		'https://drive.google.com/file/d/x/view',
		'https://www.youtube.com/channel/abc',
		'https://evilyoutube.com/watch?v=x',
		'not a url'
	])('does not embed %s', (link) => {
		expect(toEmbedUrl(link)).toBeNull();
	});
});
