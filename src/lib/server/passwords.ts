/** Readable random password (no 0/O/1/l to avoid typos when it's dictated). */
export function generatePassword(): string {
	const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const bytes = crypto.getRandomValues(new Uint8Array(12));
	const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
	return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}
