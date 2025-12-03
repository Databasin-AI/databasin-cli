/**
 * Authentication and Token Management for Databasin CLI
 *
 * Provides secure JWT token storage, retrieval, and validation.
 * Tokens are loaded with priority order: ENV > PROJECT_FILE > USER_FILE
 *
 * Token storage locations:
 * 1. Environment variable (DATABASIN_TOKEN) - highest priority
 * 2. Project-specific file (.token in current directory)
 * 3. User-wide file (~/.databasin/.token)
 *
 * @module utils/auth
 */

import { existsSync, readFileSync, writeFileSync, chmodSync, unlinkSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import { homedir } from 'os';
import { AuthError, FileSystemError } from './errors.ts';
import { ensureConfigDir } from '../config.ts';
import { ENV_VARS } from '../types/config.ts';

/**
 * JWT Token payload structure (decoded token body)
 *
 * Standard JWT claims plus custom Databasin claims.
 * Used for validation and metadata extraction.
 */
export interface JwtPayload {
	/** Subject (user ID) */
	sub?: string;

	/** Expiration time (seconds since epoch) */
	exp?: number;

	/** Issued at time (seconds since epoch) */
	iat?: number;

	/** Issuer */
	iss?: string;

	/** Audience */
	aud?: string;

	/** Additional custom claims */
	[key: string]: unknown;
}

/**
 * Get all token file paths in priority order
 *
 * Returns paths that will be checked for token files.
 * Earlier paths have higher priority.
 *
 * @returns Array of token file paths (highest to lowest priority)
 */
export function getTokenPaths(): string[] {
	return [
		join(cwd(), '.token'), // Project-specific token
		join(homedir(), '.databasin', '.token') // User-wide token
	];
}

/**
 * Get the default token save path
 *
 * Returns the recommended location for saving user tokens.
 * Uses the user-wide location by default.
 *
 * @returns Absolute path to default token file location
 */
export function getDefaultTokenPath(): string {
	return join(homedir(), '.databasin', '.token');
}

/**
 * Load token from environment variable
 *
 * Checks DATABASIN_TOKEN environment variable for token.
 * Trims whitespace and returns null if not found or empty.
 *
 * @returns Token string or null if not found
 */
function loadTokenFromEnv(): string | null {
	const token = process.env[ENV_VARS.TOKEN];
	return token ? token.trim() : null;
}

/**
 * Load token from file
 *
 * Checks multiple file locations in priority order:
 * 1. Current directory (.token)
 * 2. User config directory (~/.databasin/.token)
 *
 * Returns the first valid token found, or null if none exist.
 *
 * @returns Token string or null if not found
 * @throws {FileSystemError} If file exists but cannot be read
 */
function loadTokenFromFile(): string | null {
	const paths = getTokenPaths();

	for (const path of paths) {
		if (existsSync(path)) {
			try {
				const token = readFileSync(path, 'utf-8').trim();
				if (token) {
					return token;
				}
			} catch (error) {
				throw new FileSystemError(
					`Failed to read token file: ${error instanceof Error ? error.message : String(error)}`,
					path,
					'read'
				);
			}
		}
	}

	return null;
}

/**
 * Load token from all sources with priority
 *
 * Priority order (highest to lowest):
 * 1. DATABASIN_TOKEN environment variable
 * 2. Project token file (${cwd}/.token)
 * 3. User token file (~/.databasin/.token)
 *
 * @returns Token string
 * @throws {AuthError} If no token is found in any location
 */
export function loadToken(): string {
	// Try environment variable first (highest priority)
	const envToken = loadTokenFromEnv();
	if (envToken) {
		return envToken;
	}

	// Try token files (project, then user)
	const fileToken = loadTokenFromFile();
	if (fileToken) {
		return fileToken;
	}

	// No token found in any location
	throw new AuthError(
		'No authentication token found',
		`Token must be provided via:\n` +
			`  1. Environment variable: ${ENV_VARS.TOKEN}\n` +
			`  2. Project token file: ${join(cwd(), '.token')}\n` +
			`  3. User token file: ${getDefaultTokenPath()}\n\n` +
			`Run 'databasin auth login' to authenticate.`
	);
}

/**
 * Save token to file with secure permissions
 *
 * Writes token to specified file (or default user location).
 * Creates config directory if needed.
 * Sets file permissions to 0600 (read/write for owner only).
 *
 * @param token - JWT token string to save
 * @param path - Optional custom path (defaults to user-wide location)
 * @throws {FileSystemError} If file cannot be written
 */
export function saveToken(token: string, path?: string): void {
	const tokenPath = path || getDefaultTokenPath();

	// Ensure directory exists (only if using default path)
	if (!path) {
		ensureConfigDir();
	}

	try {
		// Write token to file with secure permissions
		writeFileSync(tokenPath, token.trim() + '\n', { mode: 0o600 });

		// Ensure permissions are correct (in case umask interfered)
		chmodSync(tokenPath, 0o600);
	} catch (error) {
		throw new FileSystemError(
			`Failed to save token file: ${error instanceof Error ? error.message : String(error)}`,
			tokenPath,
			'write'
		);
	}
}

/**
 * Delete token file
 *
 * Removes token file from specified path (or default location).
 * No-op if file doesn't exist.
 *
 * @param path - Optional custom path (defaults to user-wide location)
 * @throws {FileSystemError} If file exists but cannot be deleted
 */
export function deleteToken(path?: string): void {
	const tokenPath = path || getDefaultTokenPath();

	if (!existsSync(tokenPath)) {
		return; // Already deleted or never existed
	}

	try {
		unlinkSync(tokenPath);
	} catch (error) {
		throw new FileSystemError(
			`Failed to delete token file: ${error instanceof Error ? error.message : String(error)}`,
			tokenPath,
			'delete'
		);
	}
}

/**
 * Check if token exists in any location
 *
 * Checks environment variable and all token file locations.
 * Does not validate token format or expiration.
 *
 * @returns True if token is found in any location
 */
export function hasToken(): boolean {
	// Check environment variable first
	if (loadTokenFromEnv()) {
		return true;
	}

	// Check file locations
	const paths = getTokenPaths();
	return paths.some((path) => existsSync(path));
}

/**
 * Get the location where token was found
 *
 * Identifies which source provided the active token.
 * Useful for debugging and displaying token source to users.
 *
 * @returns Human-readable token source description or null if not found
 */
export function getTokenSource(): string | null {
	// Check environment variable
	if (loadTokenFromEnv()) {
		return `environment variable (${ENV_VARS.TOKEN})`;
	}

	// Check file locations
	const paths = getTokenPaths();
	for (const path of paths) {
		if (existsSync(path)) {
			return path;
		}
	}

	return null;
}

/**
 * Parse JWT token payload
 *
 * Decodes the JWT payload (middle section) without signature verification.
 * This is sufficient for extracting metadata and checking expiration.
 * Server-side verification happens when token is used with API.
 *
 * @param token - JWT token string
 * @returns Decoded token payload
 * @throws {AuthError} If token format is invalid or cannot be decoded
 */
export function parseJwt(token: string): JwtPayload {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) {
			throw new Error('Invalid JWT format: must have 3 parts (header.payload.signature)');
		}

		// Decode base64url payload (middle section)
		const payload = parts[1];
		const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
			'utf-8'
		);

		return JSON.parse(decoded);
	} catch (error) {
		throw new AuthError(
			`Invalid JWT token: ${error instanceof Error ? error.message : String(error)}`,
			'Ensure you have a valid JWT token from Databasin'
		);
	}
}

/**
 * Check if JWT token is expired
 *
 * Parses token and checks expiration claim (exp) against current time.
 * Tokens without expiration claim are considered valid.
 *
 * @param token - JWT token string
 * @returns True if token is expired, false if still valid
 */
export function isTokenExpired(token: string): boolean {
	try {
		const payload = parseJwt(token);

		// No expiration claim = never expires
		if (!payload.exp) {
			return false;
		}

		// JWT exp is in seconds, Date.now() is in milliseconds
		const expirationTime = payload.exp * 1000;
		const currentTime = Date.now();

		return currentTime >= expirationTime;
	} catch {
		// If we can't parse it, consider it expired/invalid
		return true;
	}
}

/**
 * Get token expiration time
 *
 * Extracts and returns the expiration timestamp from token.
 * Returns null if token has no expiration claim.
 *
 * @param token - JWT token string
 * @returns Expiration date or null if no expiration
 */
export function getTokenExpiration(token: string): Date | null {
	try {
		const payload = parseJwt(token);
		return payload.exp ? new Date(payload.exp * 1000) : null;
	} catch {
		return null;
	}
}

/**
 * Get token subject (user ID)
 *
 * Extracts the subject claim (sub) from token.
 * The subject typically contains the user ID or identifier.
 *
 * @param token - JWT token string
 * @returns User ID string or null if not present
 */
export function getTokenSubject(token: string): string | null {
	try {
		const payload = parseJwt(token);
		return payload.sub || null;
	} catch {
		return null;
	}
}

/**
 * Validate token format
 *
 * Performs basic structure validation without signature verification.
 * Checks for valid JWT format (3 parts) and parseable payload.
 *
 * @param token - Token string to validate
 * @returns True if token has valid JWT format
 */
export function validateTokenFormat(token: string): boolean {
	if (!token || typeof token !== 'string') {
		return false;
	}

	const parts = token.trim().split('.');
	if (parts.length !== 3) {
		return false;
	}

	try {
		// Try to parse the payload
		parseJwt(token);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get time until token expiration in milliseconds
 *
 * Calculates remaining time before token expires.
 * Returns null if token has no expiration.
 * Returns negative value if already expired.
 *
 * @param token - JWT token string
 * @returns Milliseconds until expiration, or null if no expiration
 */
export function getTimeUntilExpiration(token: string): number | null {
	const expiration = getTokenExpiration(token);
	if (!expiration) {
		return null;
	}

	return expiration.getTime() - Date.now();
}

/**
 * Format token expiration for display
 *
 * Converts token expiration into human-readable format.
 * Examples: "2 days", "5h 30m", "45 minutes", "Expired"
 *
 * @param token - JWT token string
 * @returns Formatted expiration string
 */
export function formatTokenExpiration(token: string): string {
	const expiration = getTokenExpiration(token);

	if (!expiration) {
		return 'No expiration';
	}

	const timeUntil = getTimeUntilExpiration(token);

	if (timeUntil === null) {
		return 'Unknown';
	}

	if (timeUntil <= 0) {
		return 'Expired';
	}

	// Convert to hours and minutes
	const hours = Math.floor(timeUntil / (1000 * 60 * 60));
	const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

	// Format based on time remaining
	if (hours > 24) {
		const days = Math.floor(hours / 24);
		return `${days} day${days !== 1 ? 's' : ''}`;
	}

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}

	return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Get token issued at time
 *
 * Extracts the issued-at timestamp from token.
 * Returns null if token has no iat claim.
 *
 * @param token - JWT token string
 * @returns Issued-at date or null if not present
 */
export function getTokenIssuedAt(token: string): Date | null {
	try {
		const payload = parseJwt(token);
		return payload.iat ? new Date(payload.iat * 1000) : null;
	} catch {
		return null;
	}
}

/**
 * Get token age in milliseconds
 *
 * Calculates how long ago the token was issued.
 * Returns null if token has no iat claim.
 *
 * @param token - JWT token string
 * @returns Milliseconds since token was issued, or null if no iat claim
 */
export function getTokenAge(token: string): number | null {
	const issuedAt = getTokenIssuedAt(token);
	if (!issuedAt) {
		return null;
	}

	return Date.now() - issuedAt.getTime();
}

/**
 * Format token age for display
 *
 * Converts token age into human-readable format.
 * Examples: "5 days ago", "2h ago", "30 minutes ago"
 *
 * @param token - JWT token string
 * @returns Formatted age string
 */
export function formatTokenAge(token: string): string {
	const age = getTokenAge(token);

	if (age === null) {
		return 'Unknown';
	}

	// Convert to hours and minutes
	const hours = Math.floor(age / (1000 * 60 * 60));
	const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));

	// Format based on age
	if (hours > 24) {
		const days = Math.floor(hours / 24);
		return `${days} day${days !== 1 ? 's' : ''} ago`;
	}

	if (hours > 0) {
		return `${hours}h ago`;
	}

	return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
}
