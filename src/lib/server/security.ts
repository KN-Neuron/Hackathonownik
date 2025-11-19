import { error, type RequestEvent } from '@sveltejs/kit';
import type { User } from '$lib/types';
import { randomBytes } from 'crypto';

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
	count: number;
	resetTime: number;
	blocked?: boolean;
	blockUntil?: number;
}

class RateLimiter {
	private store = new Map<string, RateLimitEntry>();
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		// Cleanup co 5 minut
		this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
	}

	private cleanup() {
		const now = Date.now();
		for (const [key, entry] of this.store.entries()) {
			if (
				entry.resetTime < now &&
				(!entry.blocked || (entry.blockUntil && entry.blockUntil < now))
			) {
				this.store.delete(key);
			}
		}
	}

	check(
		identifier: string,
		maxRequests: number,
		windowMs: number,
		blockDurationMs: number = 15 * 60 * 1000 // 15 minut default
	): { allowed: boolean; remaining: number; resetTime: number } {
		const now = Date.now();
		const entry = this.store.get(identifier);

		// Sprawdź czy jest zablokowany
		if (entry?.blocked && entry.blockUntil && entry.blockUntil > now) {
			return {
				allowed: false,
				remaining: 0,
				resetTime: entry.blockUntil
			};
		}

		// Reset jeśli okno czasowe minęło
		if (!entry || entry.resetTime < now) {
			this.store.set(identifier, {
				count: 1,
				resetTime: now + windowMs
			});
			return {
				allowed: true,
				remaining: maxRequests - 1,
				resetTime: now + windowMs
			};
		}

		// Increment counter
		entry.count++;

		// Jeśli przekroczono limit - zablokuj
		if (entry.count > maxRequests) {
			entry.blocked = true;
			entry.blockUntil = now + blockDurationMs;
			this.store.set(identifier, entry);

			return {
				allowed: false,
				remaining: 0,
				resetTime: entry.blockUntil
			};
		}

		this.store.set(identifier, entry);

		return {
			allowed: true,
			remaining: maxRequests - entry.count,
			resetTime: entry.resetTime
		};
	}

	reset(identifier: string) {
		this.store.delete(identifier);
	}

	destroy() {
		clearInterval(this.cleanupInterval);
		this.store.clear();
	}
}

// Instancje rate limiterów
export const rateLimiters = {
	general: new RateLimiter(), // Ogólne requesty
	auth: new RateLimiter(), // Login/auth endpoints
	upload: new RateLimiter(), // Upload plików
	api: new RateLimiter() // API calls
};

// ============================================
// CSRF PROTECTION
// ============================================

export class CSRFProtection {
	private static readonly TOKEN_LENGTH = 32;
	private static readonly COOKIE_NAME = 'csrf_token';
	private static readonly HEADER_NAME = 'x-csrf-token';

	static generateToken(): string {
		return randomBytes(this.TOKEN_LENGTH).toString('hex');
	}

	static validateToken(event: RequestEvent): boolean {
		// GET, HEAD, OPTIONS są bezpieczne
		if (['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
			return true;
		}

		const cookieToken = event.cookies.get(this.COOKIE_NAME);
		const headerToken = event.request.headers.get(this.HEADER_NAME);

		// Dla form submissions, sprawdź również w body
		let formToken: string | null = null;
		if (
			event.request.headers.get('content-type')?.includes('multipart/form-data') ||
			event.request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')
		) {
			// Token będzie sprawdzony w action handler
			return true; // Tymczasowo przepuść, validacja w action
		}

		if (!cookieToken || (!headerToken && !formToken)) {
			return false;
		}

		return cookieToken === (headerToken || formToken);
	}

	static setToken(event: RequestEvent, token?: string): string {
		const csrfToken = token || this.generateToken();
		event.cookies.set(this.COOKIE_NAME, csrfToken, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			path: '/',
			maxAge: 60 * 60 * 2 // 2 godziny
		});
		return csrfToken;
	}

	static getToken(event: RequestEvent): string | undefined {
		return event.cookies.get(this.COOKIE_NAME);
	}
}

// ============================================
// INPUT VALIDATION & SANITIZATION
// ============================================

export class InputValidator {
	// XSS Prevention - sanityzacja HTML
	static sanitizeHtml(input: string): string {
		const map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#x27;',
			'/': '&#x2F;'
		};
		return input.replace(/[&<>"'/]/g, (char) => map[char]);
	}

	// SQL Injection Prevention (chociaż PocketBase to obsługuje)
	static sanitizeSql(input: string): string {
		return input.replace(/['";\\]/g, '');
	}

	// Path Traversal Prevention
	static sanitizePath(path: string): string {
		return path.replace(/\.\.\//g, '').replace(/\.\./g, '');
	}

	// Email validation
	static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email) && email.length <= 254;
	}

	// Filename validation
	static isValidFilename(filename: string): boolean {
		// Tylko alfanumeryczne, kropki, myślniki, podkreślenia
		const filenameRegex = /^[a-zA-Z0-9._-]+$/;
		return filenameRegex.test(filename) && !filename.includes('..');
	}

	// File extension validation
	static hasAllowedExtension(filename: string, allowed: string[]): boolean {
		const ext = filename.toLowerCase().split('.').pop();
		return ext ? allowed.includes(ext) : false;
	}

	// Validate MIME type
	static isValidMimeType(mimeType: string, allowed: string[]): boolean {
		return allowed.includes(mimeType.toLowerCase());
	}
}

// ============================================
// FILE UPLOAD SECURITY
// ============================================

export class FileUploadSecurity {
	static readonly ALLOWED_PDF_MIME_TYPES = ['application/pdf'];

	static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

	static async validatePdfUpload(file: File): Promise<{ valid: boolean; error?: string }> {
		// Sprawdź czy plik istnieje
		if (!file || file.size === 0) {
			return { valid: false, error: 'No file provided' };
		}

		// Sprawdź rozmiar
		if (file.size > this.MAX_FILE_SIZE) {
			return {
				valid: false,
				error: `File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
			};
		}

		// Sprawdź nazwę pliku
		if (!InputValidator.isValidFilename(file.name)) {
			return {
				valid: false,
				error: 'Invalid filename. Use only alphanumeric characters, dots, dashes, and underscores'
			};
		}

		// Sprawdź rozszerzenie
		if (!InputValidator.hasAllowedExtension(file.name, ['pdf'])) {
			return { valid: false, error: 'Only PDF files are allowed' };
		}

		// Sprawdź MIME type
		if (!InputValidator.isValidMimeType(file.type, this.ALLOWED_PDF_MIME_TYPES)) {
			return { valid: false, error: 'Invalid file type. Only PDF files are allowed' };
		}

		// Sprawdź magic number (pierwsze bajty pliku) dla PDF
		try {
			const buffer = await file.arrayBuffer();
			const bytes = new Uint8Array(buffer);

			// PDF powinien zaczynać się od "%PDF"
			const pdfSignature = [0x25, 0x50, 0x44, 0x46]; // %PDF
			const isValidPdf = pdfSignature.every((byte, index) => bytes[index] === byte);

			if (!isValidPdf) {
				return { valid: false, error: 'File is not a valid PDF' };
			}
		} catch (e) {
			return { valid: false, error: 'Could not validate file content' };
		}

		return { valid: true };
	}

	// Server-side file validation for uploaded files (works with SvelteKit formData)
	static async validatePdfUploadServerSide(
		file: {
			name?: string;
			type?: string;
			size?: number;
			stream: () => ReadableStream;  // For SvelteKit file handling
			arrayBuffer?: () => Promise<ArrayBuffer>;  // Browser File API
			text?: () => Promise<string>;
		}
	): Promise<{ valid: boolean; error?: string }> {
		// First check: check if file exists and has content
		if (!file || (typeof file.size !== 'undefined' && file.size === 0)) {
			return { valid: false, error: 'No file provided' };
		}

		// Check size - if size property exists, use it directly
		if (file.size !== undefined && file.size > this.MAX_FILE_SIZE) {
			return {
				valid: false,
				error: `File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
			};
		}

		// Check filename
		if (!file.name) {
			return { valid: false, error: 'File must have a name' };
		}

		if (!InputValidator.isValidFilename(file.name)) {
			return {
				valid: false,
				error: 'Invalid filename. Use only alphanumeric characters, dots, dashes, and underscores'
			};
		}

		// Check extension
		if (!InputValidator.hasAllowedExtension(file.name, ['pdf'])) {
			return { valid: false, error: 'Only PDF files are allowed' };
		}

		// Check MIME type if provided
		if (file.type && !InputValidator.isValidMimeType(file.type, this.ALLOWED_PDF_MIME_TYPES)) {
			return { valid: false, error: 'Invalid file type. Only PDF files are allowed' };
		}

		// For server-side validation, we need to read the first few bytes to check magic number
		// This is more complex in server environment
		try {
			// For server-side, we need to read the first 4 bytes from the stream
			// Create a small buffer to read the first 4 bytes
			const arrayBuffer = file.arrayBuffer ? await file.arrayBuffer() : await this.readFirstBytes(file, 4);

			if (!arrayBuffer) {
				return { valid: false, error: 'Could not read file content' };
			}

			const bytes = new Uint8Array(arrayBuffer);

			// Check if the first 4 bytes match PDF signature
			const pdfSignature = [0x25, 0x50, 0x44, 0x46]; // %PDF
			const isValidPdf = pdfSignature.every((byte, index) => bytes[index] === byte);

			if (!isValidPdf) {
				return { valid: false, error: 'File is not a valid PDF' };
			}
		} catch (e) {
			return { valid: false, error: 'Could not validate file content' };
		}

		return { valid: true };
	}

	// Helper method to read first N bytes from a file stream
	private static async readFirstBytes(file: { stream: () => ReadableStream }, byteCount: number): Promise<ArrayBuffer | null> {
		const reader = file.stream().getReader();
		const buffers: Uint8Array[] = [];
		let totalBytes = 0;

		try {
			while (totalBytes < byteCount) {
				const { done, value } = await reader.read();

				if (done) break;

				buffers.push(value);
				totalBytes += value.length;

				// We only need the first N bytes for signature validation
				if (totalBytes >= byteCount) break;
			}
		} finally {
			reader.releaseLock();
		}

		if (totalBytes === 0) return null;

		// Combine all buffers and take only the required bytes
		const combinedBuffer = new Uint8Array(byteCount);
		let offset = 0;

		for (const buffer of buffers) {
			const bytesToCopy = Math.min(buffer.length, byteCount - offset);
			combinedBuffer.set(buffer.subarray(0, bytesToCopy), offset);
			offset += bytesToCopy;

			if (offset >= byteCount) break;
		}

		return combinedBuffer.buffer as ArrayBuffer;
	}
}

// ============================================
// SECURITY CLASS (dla hooks.server.ts)
// ============================================

export class Security {
	private readonly user: User | null;
	private readonly event: RequestEvent;
	private rateLimitChecks: Set<string> = new Set(); // Track which rate limit checks have been performed

	constructor(event: RequestEvent) {
		this.event = event;
		this.user = event.locals.user || null;
	}

	// Sprawdź czy użytkownik jest zalogowany
	isAuthenticated(): this {
		if (!this.user) {
			error(401, 'Unauthorized. Please log in.');
		}
		return this;
	}

	// Sprawdź czy użytkownik jest adminem
	isAdmin(): this {
		this.isAuthenticated();
		if (!this.user?.admin) {
			error(403, 'Forbidden. Admin access required.');
		}
		return this;
	}

	// Sprawdź czy użytkownik jest jury
	isJury(): this {
		this.isAuthenticated();
		if (this.user?.role !== 'jury' && !this.user?.admin) {
			error(403, 'Forbidden. Jury access required.');
		}
		return this;
	}

	// Sprawdź czy użytkownik należy do danego teamu
	isTeamMember(teamId: string): this {
		this.isAuthenticated();
		if (this.user?.team !== teamId && !this.user?.admin) {
			error(403, "Forbidden. You can only access your team's resources.");
		}
		return this;
	}

	// Sprawdź rate limit - this checks and potentially increments the counter
	// For idempotent checks that don't increment, use checkRateLimitWithoutIncrement
	checkRateLimit(
		type: 'general' | 'auth' | 'upload' | 'api',
		maxRequests: number,
		windowMs: number
	): void {
		const identifier = this.getRateLimitIdentifier();
		const checkKey = `${type}:${identifier}`;

		// Check if this specific rate limit check has already been performed in this request
		if (this.rateLimitChecks.has(checkKey)) {
			// Already checked, get current status without incrementing
			const limiter = rateLimiters[type];
			const now = Date.now();
			const entry = limiter.store.get(identifier);

			// If already blocked, reject
			if (entry?.blocked && entry.blockUntil && entry.blockUntil > now) {
				const retryAfter = Math.ceil((entry.blockUntil - Date.now()) / 1000);
				error(429, 'Too many requests. Please try again later.');
			}

			// If already hit the limit in this window, reject
			if (entry && entry.resetTime > now && entry.count >= maxRequests) {
				const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
				error(429, 'Too many requests. Please try again later.');
			}

			// If not rate limited, return without incrementing
			return;
		}

		// First time checking this specific rate limit type for this identifier
		// Mark it as checked to prevent double counting in this request
		this.rateLimitChecks.add(checkKey);

		const limiter = rateLimiters[type];
		const result = limiter.check(identifier, maxRequests, windowMs);

		// Dodaj headery rate limit do response
		this.event.setHeaders({
			'X-RateLimit-Limit': maxRequests.toString(),
			'X-RateLimit-Remaining': result.remaining.toString(),
			'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
		});

		if (!result.allowed) {
			const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
			error(429, 'Too many requests. Please try again later.');
		}
	}

	// Check rate limit without incrementing the counter (for idempotent checks)
	checkRateLimitWithoutIncrement(
		type: 'general' | 'auth' | 'upload' | 'api',
		maxRequests: number,
		windowMs: number
	): void {
		const identifier = this.getRateLimitIdentifier();
		const limiter = rateLimiters[type];

		// Check rate limit status without incrementing
		const now = Date.now();
		const entry = limiter.store.get(identifier);

		// If no entry exists or window has expired, allow request
		if (!entry || entry.resetTime < now) {
			return; // Not yet rate limited
		}

		// If already blocked, reject
		if (entry.blocked && entry.blockUntil && entry.blockUntil > now) {
			const retryAfter = Math.ceil((entry.blockUntil - Date.now()) / 1000);
			error(429, 'Too many requests. Please try again later.');
		}

		// If count has reached max requests in current window, reject
		if (entry.count >= maxRequests) {
			const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
			error(429, 'Too many requests. Please try again later.');
		}
	}

	// Walidacja CSRF
	validateCSRF(): this {
		if (!CSRFProtection.validateToken(this.event)) {
			error(403, 'CSRF token validation failed');
		}
		return this;
	}

	// Helper do generowania identyfikatora dla rate limiting
	private getRateLimitIdentifier(): string {
		// Użyj user ID jeśli zalogowany, w przeciwnym razie IP
		if (this.user?.id) {
			return `user:${this.user.id}`;
		}

		const ip = this.event.getClientAddress();
		return `ip:${ip}`;
	}

	// Pobierz user
	getUser(): User | null {
		return this.user;
	}
}

// ============================================
// CONTENT SECURITY POLICY
// ============================================

export const CSP_HEADERS = {
	'Content-Security-Policy': [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net", // unsafe-eval dla Svelte dev
		"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
		"img-src 'self' data: https:",
		"font-src 'self' data: https:",
		"connect-src 'self' https://frog01-32147.wykr.es",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'"
	].join('; ')
};

// ============================================
// SECURITY HEADERS
// ============================================

export const SECURITY_HEADERS = {
	...CSP_HEADERS,
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};
