/**
 * Context Management for Databasin CLI
 *
 * Manages user's working context (project, connector, etc.) between commands.
 * Stores context in ~/.databasin/context.json with atomic writes for safety.
 *
 * This allows users to set a default project or connector once, then reference
 * it in subsequent commands without repeating the same flags.
 *
 * // TODO: migrate to API - server-side user preferences would be more portable
 *
 * @module utils/context
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from '../config.ts';
import { FileSystemError } from './errors.ts';

/**
 * CLI context structure
 *
 * Stores user's current working context between commands.
 * All fields are optional - empty context is valid.
 */
export interface CliContext {
	/** Current project ID or name */
	project?: string;
	/** Current connector ID */
	connector?: string;
	/** Timestamp of last update (ISO 8601) */
	updatedAt?: string;
}

/**
 * Get the context file path
 *
 * Returns the path to the CLI context file in the user's config directory.
 *
 * @returns Absolute path to context.json file
 */
export function getContextFilePath(): string {
	return join(getConfigDir(), 'context.json');
}

/**
 * Load context from file
 *
 * Reads and parses the context file. Returns empty object if file doesn't exist.
 * Handles corrupted files gracefully by returning empty context.
 *
 * Thread-safe: Only reads, doesn't modify file.
 *
 * @returns Current CLI context (empty object if file doesn't exist or is corrupted)
 *
 * @example
 * ```typescript
 * const context = loadContext();
 * if (context.project) {
 *   console.log(`Current project: ${context.project}`);
 * }
 * ```
 */
export function loadContext(): CliContext {
	const filePath = getContextFilePath();

	// Return empty context if file doesn't exist
	if (!existsSync(filePath)) {
		return {};
	}

	try {
		const content = readFileSync(filePath, 'utf-8');

		// Handle empty file
		if (!content.trim()) {
			return {};
		}

		const parsed = JSON.parse(content);

		// Validate structure
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			// Corrupted file - return empty context
			return {};
		}

		return parsed as CliContext;
	} catch (error: any) {
		// File is corrupted or unreadable - return empty context
		// This is intentionally non-throwing for resilience
		return {};
	}
}

/**
 * Save context to file
 *
 * Writes context to the context file using atomic write pattern.
 * Creates config directory if it doesn't exist.
 * Updates the updatedAt timestamp automatically.
 *
 * Thread-safe: Uses atomic write (write to temp, then rename).
 *
 * @param context - Context to save
 * @throws {FileSystemError} If file write fails
 *
 * @example
 * ```typescript
 * saveContext({ project: '123', connector: '456' });
 * ```
 */
export function saveContext(context: CliContext): void {
	const filePath = getContextFilePath();
	const configDir = getConfigDir();

	// Ensure config directory exists
	if (!existsSync(configDir)) {
		try {
			mkdirSync(configDir, { recursive: true, mode: 0o700 });
		} catch (error: any) {
			throw new FileSystemError(
				`Failed to create config directory: ${error.message}`,
				configDir,
				'write'
			);
		}
	}

	// Add updated timestamp
	const contextWithTimestamp: CliContext = {
		...context,
		updatedAt: new Date().toISOString()
	};

	// Atomic write: write to temp file first, then rename
	const tempFile = `${filePath}.tmp`;

	try {
		// Write to temp file
		const content = JSON.stringify(contextWithTimestamp, null, 2) + '\n';
		writeFileSync(tempFile, content, { mode: 0o600 });

		// Atomic rename
		renameSync(tempFile, filePath);
	} catch (error: any) {
		// Clean up temp file if it exists
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore cleanup errors
		}

		throw new FileSystemError(
			`Failed to save context: ${error.message}`,
			filePath,
			'write'
		);
	}
}

/**
 * Clear context
 *
 * Clears all context or a specific context key.
 * If no key is provided, clears the entire context file.
 * If a key is provided, removes only that key.
 *
 * @param key - Optional context key to clear (if omitted, clears all)
 *
 * @example
 * ```typescript
 * // Clear specific key
 * clearContext('project');
 *
 * // Clear all context
 * clearContext();
 * ```
 */
export function clearContext(key?: keyof CliContext): void {
	if (!key) {
		// Clear entire context file
		const filePath = getContextFilePath();
		if (existsSync(filePath)) {
			try {
				unlinkSync(filePath);
			} catch (error: any) {
				throw new FileSystemError(
					`Failed to clear context: ${error.message}`,
					filePath,
					'delete'
				);
			}
		}
		return;
	}

	// Clear specific key
	const context = loadContext();
	delete context[key];

	// Save updated context
	saveContext(context);
}

/**
 * Get a specific context value
 *
 * Retrieves a single context value from the current context.
 * Returns undefined if the key doesn't exist or context file is missing.
 *
 * @param key - Context key to retrieve
 * @returns Value for the specified key, or undefined
 *
 * @example
 * ```typescript
 * const projectId = getContext('project');
 * if (projectId) {
 *   console.log(`Using project: ${projectId}`);
 * }
 * ```
 */
export function getContext(key: keyof CliContext): string | undefined {
	const context = loadContext();
	return context[key];
}

/**
 * Set a specific context value
 *
 * Updates a single context value, preserving other values.
 * Loads current context, updates the key, and saves atomically.
 *
 * @param key - Context key to update
 * @param value - New value for the key
 *
 * @example
 * ```typescript
 * setContext('project', '123');
 * setContext('connector', '456');
 * ```
 */
export function setContext(key: keyof CliContext, value: string): void {
	const context = loadContext();
	context[key] = value;
	saveContext(context);
}
