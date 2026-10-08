// Turn a YouTube or Loom link into an embeddable player URL; null for anything else
export function toEmbedUrl(link: string): string | null {
	let url: URL;
	try {
		url = new URL(link);
	} catch {
		return null;
	}

	const host = url.hostname.replace(/^(www\.|m\.)/, '');
	const id = (value: string | null | undefined) => (value && /^[\w-]+$/.test(value) ? value : null);

	if (host === 'youtu.be') {
		const videoId = id(url.pathname.slice(1));
		return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
	}

	if (host === 'youtube.com') {
		const [, kind, rest] = url.pathname.split('/');
		const videoId =
			kind === 'watch'
				? id(url.searchParams.get('v'))
				: ['shorts', 'embed', 'live'].includes(kind)
					? id(rest)
					: null;
		return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
	}

	if (host === 'loom.com') {
		const [, kind, rest] = url.pathname.split('/');
		const videoId = ['share', 'embed'].includes(kind) ? id(rest) : null;
		return videoId ? `https://www.loom.com/embed/${videoId}` : null;
	}

	return null;
}
