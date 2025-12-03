/**
 * Error Handling Utilities for DataBasin CLI
 *
 * Provides custom error classes and formatting for user-friendly error messages.
 * Follows patterns from the DataBasin API plugin skills for consistency.
 *
 * @module utils/errors
 */

/**
 * Base CLI Error class
 *
 * All custom CLI errors extend this class to provide consistent error handling
 * with exit codes and helpful suggestions for users.
 */
export class CliError extends Error {
	/**
	 * Creates a new CLI error
	 *
	 * @param message - Error message to display
	 * @param exitCode - Process exit code (default: 1)
	 * @param suggestion - Optional suggestion for fixing the error
	 */
	constructor(
		message: string,
		public exitCode: number = 1,
		public suggestion?: string
	) {
		super(message);
		this.name = 'CliError';
		Error.captureStackTrace(this, this.constructor);
	}

	/**
	 * Format error for CLI output
	 *
	 * @returns Formatted error message with optional suggestion
	 */
	toString(): string {
		let output = `Error: ${this.message}`;
		if (this.suggestion) {
			output += `\n\nSuggestion: ${this.suggestion}`;
		}
		return output;
	}
}

/**
 * API Error - HTTP request failures
 *
 * Thrown when API requests fail with HTTP error status codes.
 * Provides context-specific suggestions based on status code.
 */
export class ApiError extends CliError {
	/**
	 * Creates a new API error
	 *
	 * @param message - Error message from API or generated message
	 * @param statusCode - HTTP status code
	 * @param endpoint - API endpoint that failed
	 * @param responseBody - Optional response body for debugging
	 */
	constructor(
		message: string,
		public statusCode: number,
		public endpoint: string,
		public responseBody?: unknown
	) {
		super(message, 1);
		this.name = 'ApiError';

		// Add helpful suggestions based on status code
		this.suggestion = ApiError.getSuggestion(statusCode);
	}

	/** Additional error details from response body */
	public details?: unknown;

	/**
	 * Get helpful suggestion based on HTTP status code
	 *
	 * @param statusCode - HTTP status code
	 * @returns Helpful suggestion for the user
	 */
	static getSuggestion(statusCode: number): string {
		switch (statusCode) {
			case 400:
				return 'Check your request parameters and payload syntax. Verify required fields are present.';
			case 401:
				return 'Your authentication token may be invalid or expired. Run: databasin auth verify';
			case 403:
				return 'You do not have permission to access this resource. Check your project access rights.';
			case 404:
				return 'The requested resource was not found. Verify the ID and try again.';
			case 429:
				return 'Rate limit exceeded. Please wait a moment before retrying.';
			case 500:
			case 502:
			case 503:
			case 504:
				return 'The DataBasin API is experiencing issues. Please try again later.';
			default:
				return 'Check the error message above for details.';
		}
	}

	/**
	 * Format API error for CLI output
	 *
	 * @returns Formatted error message with status code, endpoint, and suggestion
	 */
	toString(): string {
		let output = `API Error (${this.statusCode}): ${this.message}\nEndpoint: ${this.endpoint}`;
		if (this.suggestion) {
			output += `\n\nSuggestion: ${this.suggestion}`;
		}
		return output;
	}
}

/**
 * Authentication Error - token or login issues
 *
 * Thrown when authentication fails or token is invalid/missing.
 */
export class AuthError extends CliError {
	/**
	 * Creates a new authentication error
	 *
	 * @param message - Error message
	 * @param suggestion - Optional custom suggestion (default: Run auth login)
	 */
	constructor(message: string, suggestion?: string) {
		super(message, 1, suggestion || 'Run: databasin auth login');
		this.name = 'AuthError';
	}
}

/**
 * Validation Error - invalid input or configuration
 *
 * Thrown when user input fails validation or contains invalid data.
 */
export class ValidationError extends CliError {
	/**
	 * Creates a new validation error
	 *
	 * @param message - Error message
	 * @param field - Optional field name that failed validation
	 * @param errors - Optional array of specific validation errors
	 */
	constructor(
		message: string,
		public field?: string,
		public errors?: string[]
	) {
		super(message, 1);
		this.name = 'ValidationError';

		if (errors && errors.length > 0) {
			this.suggestion = 'Fix the following validation errors:\n  - ' + errors.join('\n  - ');
		}
	}

	/**
	 * Format validation error for CLI output
	 *
	 * @returns Formatted error message with field and validation errors
	 */
	toString(): string {
		let output = `Validation Error: ${this.message}`;
		if (this.field) {
			output += ` (field: ${this.field})`;
		}
		if (this.suggestion) {
			output += `\n\n${this.suggestion}`;
		}
		return output;
	}
}

/**
 * Configuration Error - config file or environment issues
 *
 * Thrown when configuration is missing, invalid, or cannot be loaded.
 */
export class ConfigError extends CliError {
	/**
	 * Creates a new configuration error
	 *
	 * @param message - Error message
	 * @param configPath - Optional path to the config file
	 */
	constructor(
		message: string,
		public configPath?: string
	) {
		super(message, 1, 'Check your configuration file or environment variables');
		this.name = 'ConfigError';
	}

	/**
	 * Format configuration error for CLI output
	 *
	 * @returns Formatted error message with config path and suggestion
	 */
	toString(): string {
		let output = `Configuration Error: ${this.message}`;
		if (this.configPath) {
			output += `\nConfig file: ${this.configPath}`;
		}
		output += `\n\nSuggestion: ${this.suggestion}`;
		return output;
	}
}

/**
 * File System Error - file read/write issues
 *
 * Thrown when file system operations fail (read, write, delete).
 */
export class FileSystemError extends CliError {
	/**
	 * Creates a new file system error
	 *
	 * @param message - Error message
	 * @param path - File path that caused the error
	 * @param operation - Type of operation that failed
	 */
	constructor(
		message: string,
		public path: string,
		public operation: 'read' | 'write' | 'delete'
	) {
		super(message, 1);
		this.name = 'FileSystemError';
		this.suggestion = `Check that the file exists and you have ${operation} permissions: ${path}`;
	}
}

/**
 * Network Error - connection failures
 *
 * Thrown when network requests fail due to connectivity issues.
 */
export class NetworkError extends CliError {
	/**
	 * Creates a new network error
	 *
	 * @param message - Error message
	 * @param url - Optional URL that failed
	 */
	constructor(
		message: string,
		public url?: string
	) {
		super(message, 1, 'Check your internet connection and verify the API URL is correct');
		this.name = 'NetworkError';
	}
}

/**
 * Format error for CLI display
 *
 * Handles both custom CliError instances and standard Errors.
 * Provides consistent error formatting across the CLI.
 *
 * @param error - Error to format (CliError, Error, or unknown)
 * @returns Formatted error message string
 */
export function formatError(error: unknown): string {
	if (error instanceof CliError) {
		return error.toString();
	}

	if (error instanceof Error) {
		return `Error: ${error.message}`;
	}

	return `Unknown error: ${String(error)}`;
}

/**
 * Extract exit code from error
 *
 * @param error - Error to extract exit code from
 * @returns Exit code (1 for standard errors, custom code for CliError)
 */
export function getExitCode(error: unknown): number {
	if (error instanceof CliError) {
		return error.exitCode;
	}
	return 1;
}

/**
 * Check if error is network-related
 *
 * Detects network errors by checking error type and message content.
 *
 * @param error - Error to check
 * @returns True if error is network-related
 */
export function isNetworkError(error: unknown): boolean {
	if (error instanceof NetworkError) {
		return true;
	}

	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes('fetch failed') ||
			message.includes('network') ||
			message.includes('econnrefused') ||
			message.includes('enotfound') ||
			message.includes('timeout')
		);
	}

	return false;
}

/**
 * Check if error is authentication-related
 *
 * Detects authentication errors by checking error type and status codes.
 *
 * @param error - Error to check
 * @returns True if error is authentication-related
 */
export function isAuthError(error: unknown): boolean {
	if (error instanceof AuthError) {
		return true;
	}

	if (error instanceof ApiError) {
		return error.statusCode === 401 || error.statusCode === 403;
	}

	return false;
}

/**
 * Create API error from fetch response (synchronous version)
 *
 * Creates an ApiError without attempting to parse the response body.
 * More efficient for error paths that don't need the response body.
 * Uses response.statusText or a default message.
 *
 * @param response - Fetch response object
 * @param endpoint - API endpoint that was called
 * @returns ApiError instance
 */
export function createApiErrorSync(response: Response, endpoint: string): ApiError {
	const message = response.statusText || `HTTP ${response.status}`;
	return new ApiError(message, response.status, endpoint);
}

/**
 * Create API error from fetch response (async version with body parsing)
 *
 * Extracts error information from HTTP response and creates an ApiError.
 * Attempts to parse JSON error messages, falls back to status text.
 * Use this when you need to include the response body in the error.
 *
 * @param response - Fetch response object
 * @param endpoint - API endpoint that was called
 * @returns Promise resolving to ApiError instance
 */
export async function createApiErrorWithBody(
	response: Response,
	endpoint: string
): Promise<ApiError> {
	let message: string;
	let responseBody: unknown;

	try {
		responseBody = await response.json();
		message = (responseBody as { message?: string }).message || response.statusText;
	} catch {
		message = response.statusText || `HTTP ${response.status}`;
	}

	return new ApiError(message, response.status, endpoint, responseBody);
}

/**
 * Create API error from fetch response
 *
 * Backward compatible alias for createApiErrorWithBody.
 * Prefer createApiErrorSync for better performance.
 *
 * @param response - Fetch response object
 * @param endpoint - API endpoint that was called
 * @returns Promise resolving to ApiError instance
 */
export const createApiError = createApiErrorWithBody;

/**
 * Handle errors gracefully and exit
 *
 * Use in command handlers to provide consistent error experience.
 * Displays formatted error message and exits with appropriate code.
 *
 * @param error - Error to handle
 * @returns Never returns (calls process.exit)
 */
export function handleError(error: unknown): never {
	console.error('\n' + formatError(error));

	// Show debug info if available
	if (process.env.DATABASIN_DEBUG === 'true' && error instanceof Error) {
		console.error('\nDebug stack trace:');
		console.error(error.stack);
	}

	process.exit(getExitCode(error));
}
