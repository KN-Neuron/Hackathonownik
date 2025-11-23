import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';

const IV_LENGTH = 16; // For AES-256-CBC

/**
 * Get encryption key from environment variable
 * Key should be a 32-byte random value encoded as base64 or hex
 * Generate with: openssl rand -base64 32
 */
function getEncryptionKey(): Buffer {
	const key = process.env.COOKIE_ENCRYPTION_KEY;

	if (!key) {
		throw new Error(
			'COOKIE_ENCRYPTION_KEY is not defined in environment variables. ' +
			'Generate one with: openssl rand -base64 32'
		);
	}

	// Try to decode as base64 first (recommended)
	try {
		const buffer = Buffer.from(key, 'base64');
		if (buffer.length === 32) {
			return buffer;
		}
	} catch (e) {
		// Not valid base64, try hex
	}

	// Try to decode as hex
	try {
		const buffer = Buffer.from(key, 'hex');
		if (buffer.length === 32) {
			return buffer;
		}
	} catch (e) {
		// Not valid hex
	}

	// If neither works, throw error
	throw new Error(
		'COOKIE_ENCRYPTION_KEY must be a 32-byte (256-bit) key encoded as base64 or hex. ' +
		'Current key length: ' + (key.length) + ' characters. ' +
		'Generate a proper key with: openssl rand -base64 32'
	);
}

export class SecureCookieHandler {
	private static readonly COOKIE_NAME = 'secure_auth_session';
	private static readonly ENCRYPTION_KEY = getEncryptionKey();

	// Encrypt and store PocketBase session data
	static encryptSession(sessionData: any): string {
		const iv = randomBytes(IV_LENGTH);
		const cipher = createCipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
		
		let encrypted = cipher.update(JSON.stringify(sessionData), 'utf8', 'hex');
		encrypted += cipher.final('hex');
		
		return iv.toString('hex') + ':' + encrypted;
	}

	// Decrypt and retrieve PocketBase session data
	static decryptSession(encryptedSession: string | undefined): any | null {
		if (!encryptedSession) return null;

		try {
			const [ivHex, encryptedHex] = encryptedSession.split(':');
			if (!ivHex || !encryptedHex) return null;

			const iv = Buffer.from(ivHex, 'hex');
			const decipher = createDecipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
			
			let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
			decrypted += decipher.final('utf8');
			
			return JSON.parse(decrypted);
		} catch (error) {
			console.error('Error decrypting session:', error);
			return null;
		}
	}

	// Set encrypted session cookie
	static setSessionCookie(event: RequestEvent, sessionData: any, maxAge: number = 7 * 24 * 60 * 60): void {
		if (!sessionData) return;

		const encryptedSession = this.encryptSession(sessionData);
		
		event.cookies.set(this.COOKIE_NAME, encryptedSession, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge
		});
	}

	// Get and decrypt session from cookie
	static getSessionFromCookie(event: RequestEvent): any | null {
		const encryptedSession = event.cookies.get(this.COOKIE_NAME);
		return this.decryptSession(encryptedSession);
	}

	// Clear session cookie
	static clearSessionCookie(event: RequestEvent): void {
		event.cookies.delete(this.COOKIE_NAME, {
			path: '/'
		});
	}
}
