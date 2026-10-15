import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { newSessionId } from './sessions';

const IV_LENGTH = 12; // For AES-256-GCM

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
			'Current key length: ' +
			key.length +
			' characters. ' +
			'Generate a proper key with: openssl rand -base64 32'
	);
}

export class SecureCookieHandler {
	private static readonly COOKIE_NAME = 'secure_auth_session';
	private static readonly ENCRYPTION_KEY = getEncryptionKey();

	// Encrypt and store PocketBase session data (AES-256-GCM: a changed cookie is rejected)
	static encryptSession(sessionData: any): string {
		const iv = randomBytes(IV_LENGTH);
		const cipher = createCipheriv('aes-256-gcm', this.ENCRYPTION_KEY, iv);
		const encrypted = Buffer.concat([
			cipher.update(JSON.stringify(sessionData), 'utf8'),
			cipher.final()
		]);
		return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64url')).join('.');
	}

	// Decrypt and retrieve PocketBase session data
	static decryptSession(encryptedSession: string | undefined): any | null {
		if (!encryptedSession) return null;

		try {
			const [iv, tag, encrypted] = encryptedSession
				.split('.')
				.map((part) => Buffer.from(part, 'base64url'));
			if (!iv || !tag || !encrypted || iv.length !== IV_LENGTH || tag.length !== 16) return null;
			const decipher = createDecipheriv('aes-256-gcm', this.ENCRYPTION_KEY, iv);
			decipher.setAuthTag(tag);
			const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
			return JSON.parse(decrypted.toString('utf8'));
		} catch {
			// Tampered, truncated or from before the switch: treated as logged out
			return null;
		}
	}

	// Set encrypted session cookie
	static setSessionCookie(
		event: RequestEvent,
		sessionData: any,
		maxAge: number = 7 * 24 * 60 * 60
	): void {
		if (!sessionData) return;

		// Every session has its own id, so logging out can end exactly this one
		const encryptedSession = this.encryptSession({
			...sessionData,
			sid: sessionData.sid || newSessionId()
		});

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
