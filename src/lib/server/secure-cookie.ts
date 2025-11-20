import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';

const ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY || randomBytes(32);
const IV_LENGTH = 16; // For AES-256-CBC

export class SecureCookieHandler {
	private static readonly COOKIE_NAME = 'secure_auth_session';
	private static readonly ENCRYPTION_KEY = Buffer.from(
		process.env.COOKIE_ENCRYPTION_KEY?.padEnd(32, '\0') || randomBytes(32).toString('hex').substring(0, 32),
		'utf8'
	).slice(0, 32); // Ensure it's exactly 32 bytes for AES-256

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