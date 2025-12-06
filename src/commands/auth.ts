/**
 * Authentication Commands for Databasin CLI
 *
 * Provides commands for verifying and displaying authentication status:
 * - auth verify: Verify token validity by calling /api/ping
 * - auth whoami: Display current authenticated user information
 *
 * @module commands/auth
 */

import { Command } from 'commander';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import type { DatabasinClient } from '../client/index.ts';
import type { ProjectsClient } from '../client/projects.ts';
import { formatOutput } from '../utils/formatters.ts';
import {
	logSuccess,
	logError,
	startSpinner,
	succeedSpinner,
	failSpinner
} from '../utils/progress.ts';
import type { CliConfig } from '../types/config.ts';
import type { User } from '../types/api.ts';
import { ApiError, NetworkError } from '../utils/errors.ts';
import { saveToken } from '../utils/auth.ts';
import { parseFields, filterFields } from '../utils/command-helpers.ts';
import chalk from 'chalk';

// Embed assets at build time - these get bundled into the executable
// @ts-ignore - Bun import with type attribute
import _loginTemplate from '../assets/login.html' with { type: 'text' };
// @ts-ignore - Bun import with type attribute
import _logoBase64 from '../assets/DatabasinLogo.png' with { type: 'base64' };

// Cast to proper types (Bun's type definitions don't handle import attributes well)
const loginTemplate = _loginTemplate as unknown as string;
const logoBase64 = _logoBase64 as unknown as string;

// Pre-compute the logo data URI for embedding in HTML
const logoDataUri = `data:image/png;base64,${logoBase64}`;

/**
 * Render login response HTML from template
 *
 * @param success - Whether login was successful
 * @param message - Optional custom message
 * @returns Rendered HTML string
 */
function renderLoginPage(success: boolean, message?: string): string {
	const statusClass = success ? 'success' : 'error';
	const icon = success ? '✓' : '✗';
	const statusTitle = success ? 'Login Successful' : 'Login Failed';
	const heading = success ? 'Login Successful!' : 'Login Failed';
	const defaultMessage = success
		? 'Your authentication token has been received.'
		: 'No authentication token received.';
	const extraContent = success
		? ''
		: '<div class="message-box error"><p>Please try again or contact support if the problem persists.</p></div>';

	return loginTemplate
		.replace(/\{\{STATUS_CLASS\}\}/g, statusClass)
		.replace(/\{\{ICON\}\}/g, icon)
		.replace(/\{\{STATUS_TITLE\}\}/g, statusTitle)
		.replace(/\{\{HEADING\}\}/g, heading)
		.replace(/\{\{MESSAGE\}\}/g, message || defaultMessage)
		.replace(/\{\{EXTRA_CONTENT\}\}/g, extraContent)
		.replace(/\{\{LOGO_URL\}\}/g, logoDataUri);
}

/**
 * Format user context data for display
 *
 * Constructs full user context including account, organizations, and projects.
 * Handles optional data gracefully with empty arrays and warning messages.
 *
 * @param user - User object from API
 * @param organizations - Optional array of organizations
 * @param projects - Optional array of projects
 * @param warnings - Optional array of warning messages
 * @returns Complete user context object for display
 */
function formatUserData(
	user: User,
	organizations?: any[],
	projects?: any[],
	warnings?: string[]
): Record<string, any> {
	const result: Record<string, any> = {
		account: {
			id: user.id || '-',
			email: user.email || '-',
			name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'
		}
	};

	// Add organizations if provided
	if (organizations !== undefined) {
		result.organizations = organizations.map((org) => ({
			id: org.id,
			name: org.name,
			shortName: org.shortName || null,
			enabled: org.enabled !== undefined ? org.enabled : true
		}));
	}

	// Add projects if provided
	if (projects !== undefined) {
		result.projects = projects.map((proj) => ({
			projectId: proj.id || proj.projectId,
			projectName: proj.name || proj.projectName,
			internalID: proj.internalID,
			institutionID: proj.organizationId || proj.institutionID,
			isActive: proj.deleted === false || !proj.deleted
		}));
	}

	// Add warnings if any
	if (warnings && warnings.length > 0) {
		result.warnings = warnings;
	}

	return result;
}

/**
 * Create auth command group
 *
 * Registers all authentication-related subcommands.
 *
 * @returns Configured Commander command
 */
export function createAuthCommand(): Command {
	const auth = new Command('auth').description('Authentication and token management');

	// ========================================
	// VERIFY COMMAND
	// ========================================

	auth
		.command('verify')
		.description('Verify authentication token validity')
		.action(async (options, command) => {
			// Get config and clients from parent command context
			const opts = command.optsWithGlobals();
			const config: CliConfig = opts._config;
			const client: DatabasinClient = opts._clients.base;

			const spinner = startSpinner('Verifying token...');

			try {
				// Call /api/ping to verify token
				const isValid = await client.ping();

				if (isValid) {
					// Token is valid - try to get user info for display
					try {
						const projectsClient: ProjectsClient = opts._clients.projects;
						const user = await projectsClient.getCurrentUser();
						const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
						const userEmail = user.email;

						succeedSpinner(spinner, 'Token is valid');

						// Show user info
						console.log(`  User: ${userEmail}`);
						if (userName) {
							console.log(`  Name: ${userName}`);
						}

						// Show organization if available
						if (user.organizationMemberships && user.organizationMemberships.length > 0) {
							const orgName = user.organizationMemberships[0].organizationName;
							if (orgName) {
								console.log(`  Organization: ${orgName}`);
							}
						}

						return;
					} catch (userError) {
						// Ping succeeded but couldn't get user info - still valid
						succeedSpinner(spinner, 'Token is valid');
						return;
					}
				} else {
					// Ping failed - invalid token
					failSpinner(spinner, 'Token is invalid or expired');
					console.error("  Suggestion: Run 'databasin auth login' to authenticate");
					throw new Error('Authentication token is invalid or expired');
				}
			} catch (error) {
				// Handle specific error types
				if (error instanceof ApiError) {
					if (error.statusCode === 401 || error.statusCode === 403) {
						failSpinner(spinner, 'Authentication failed (401 Unauthorized)');
						console.error('  Suggestion: Your token may be expired. Please obtain a new token.');
					} else {
						failSpinner(spinner, `API error (${error.statusCode} ${error.message})`);
						console.error(`  Endpoint: /api/ping`);
						if (error.details) {
							console.error(`  Message: ${error.details}`);
						}
					}
					throw error;
				} else if (error instanceof NetworkError) {
					failSpinner(spinner, 'Failed to connect to API');
					console.error(`  Endpoint: ${config.apiUrl}/api/ping`);
					console.error('  Suggestion: Check that the API server is running and accessible');
					throw error;
				} else if (error instanceof Error) {
					// Check if this is a "no token found" error
					if (error.message.includes('No authentication token found')) {
						failSpinner(spinner, 'No authentication token found');
						console.error(
							'  Suggestion: Set DATABASIN_TOKEN environment variable or create ~/.databasin/.token file'
						);
						throw new Error('No authentication token found');
					}

					// Unknown error
					failSpinner(spinner, 'Verification failed');
					logError(error.message);
					if (config.debug && error.stack) {
						console.error(error.stack);
					}
					throw error;
				} else {
					failSpinner(spinner, 'Verification failed');
					logError(String(error));
					throw new Error(String(error));
				}
			}
		});

	// ========================================
	// WHOAMI COMMAND
	// ========================================

	auth
		.command('whoami')
		.description('Display current authenticated user context (account, organizations, projects)')
		.option('--fields <fields>', 'Comma-separated list of fields to display (supports nested paths like account.email)')
		.action(async (options, command) => {
			// Get config and clients from parent command context
			const opts = command.optsWithGlobals();
			const config: CliConfig = opts._config;
			const projectsClient: ProjectsClient = opts._clients.projects;

			const spinner = startSpinner('Fetching user context...');

			try {
				// Make 3 concurrent API calls for full user context
				// Use Promise.allSettled to allow graceful degradation on partial failures
				const [userResult, orgsResult, projectsResult] = await Promise.allSettled([
					projectsClient.getCurrentUser(),
					projectsClient.listOrganizations(),
					projectsClient.list()
				]);

				// Extract successful results and track warnings
				const warnings: string[] = [];

				// User account is required - fail if this fails
				if (userResult.status === 'rejected') {
					throw userResult.reason;
				}
				const user = userResult.value;

				// Organizations - optional with graceful degradation
				let organizations: any[] = [];
				if (orgsResult.status === 'fulfilled') {
					// Handle both array and count response
					organizations = Array.isArray(orgsResult.value) ? orgsResult.value : [];
				} else {
					warnings.push(`Failed to fetch organizations: ${orgsResult.reason?.message || 'Unknown error'}`);
				}

				// Projects - optional with graceful degradation
				let projects: any[] = [];
				if (projectsResult.status === 'fulfilled') {
					// Handle both array and count response
					projects = Array.isArray(projectsResult.value) ? projectsResult.value : [];
				} else {
					warnings.push(`Failed to fetch projects: ${projectsResult.reason?.message || 'Unknown error'}`);
				}

				succeedSpinner(spinner);

				// Format full user context for display
				let userData = formatUserData(user, organizations, projects, warnings.length > 0 ? warnings : undefined);

				// Apply field filtering if requested
				if (options.fields) {
					userData = filterFields(userData, options.fields);
				}

				// Format output using detected format from config
				const format = config.output.format;
				const output = formatOutput([userData], format, {
					colors: config.output.colors
				});

				console.log(output);

				return;
			} catch (error) {
				// Handle specific error types
				if (error instanceof ApiError) {
					if (error.statusCode === 401 || error.statusCode === 403) {
						failSpinner(spinner, 'Authentication failed (401 Unauthorized)');
						console.error('  Suggestion: Your token may be expired. Please obtain a new token.');
					} else {
						failSpinner(spinner, `API error (${error.statusCode} ${error.message})`);
						console.error('  Endpoint: /api/my/account');
						if (error.details) {
							console.error(`  Message: ${error.details}`);
						}
					}
					throw error;
				} else if (error instanceof NetworkError) {
					failSpinner(spinner, 'Failed to connect to API');
					console.error(`  Endpoint: ${config.apiUrl}/api/my/account`);
					console.error('  Suggestion: Check that the API server is running and accessible');
					throw error;
				} else if (error instanceof Error) {
					// Check if this is a "no token found" error
					if (error.message.includes('No authentication token found')) {
						failSpinner(spinner, 'No authentication token found');
						console.error(
							'  Suggestion: Set DATABASIN_TOKEN environment variable or create ~/.databasin/.token file'
						);
						throw new Error('No authentication token found');
					}

					// Unknown error
					failSpinner(spinner, 'Failed to fetch user context');
					logError(error.message);
					if (config.debug && error.stack) {
						console.error(error.stack);
					}
					throw error;
				} else {
					failSpinner(spinner, 'Failed to fetch user context');
					logError(String(error));
					throw new Error(String(error));
				}
			}
		});

	// ========================================
	// LOGIN COMMAND
	// ========================================

	auth
		.command('login')
		.description('Login via browser and save authentication token')
		.option('--port <port>', 'Local server port for callback (default: 3333)', '3333')
		.option('--no-verify', 'Skip token verification after login')
		.action(loginAction);

	return auth;
}

/**
 * Shared login action handler
 *
 * Used by both `databasin login` and `databasin auth login` commands.
 * Opens browser for authentication, receives token via callback, and saves it.
 *
 * @param options - Command options
 * @param command - Commander command instance
 */
export async function loginAction(options: any, command: Command): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const client: DatabasinClient = opts._clients.base;
	const projectsClient: ProjectsClient = opts._clients.projects;

	const port = parseInt(options.port, 10);
	const callbackUrl = `http://localhost:${port}/callback`;

	console.log(chalk.bold('\n🔐 Databasin CLI Login\n'));
	console.log('Opening browser for authentication...\n');

	// Track if we received a token
	let receivedToken: string | null = null;
	let serverClosed = false;

	try {
		// Create HTTP server to receive token callback (Node.js compatible)
		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			const url = new URL(req.url || '/', `http://localhost:${port}`);

			if (url.pathname === '/callback') {
				const token = url.searchParams.get('token');

				if (token) {
					receivedToken = token;

					// Return success page with embedded logo
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end(renderLoginPage(true));
				} else {
					// No token provided
					res.writeHead(400, { 'Content-Type': 'text/html' });
					res.end(renderLoginPage(false));
				}
			} else {
				// 404 for other paths
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('Not Found');
			}
		});

		// Start server with promise to ensure it's ready
		await new Promise<void>((resolve, reject) => {
			server.on('error', reject);
			server.listen(port, () => resolve());
		});

		console.log(chalk.dim(`Local server started on http://localhost:${port}`));

		// Open browser to login page with callback URL
		const loginUrl = `${config.webUrl}/login?cli_callback=${encodeURIComponent(callbackUrl)}`;

		// Open browser (cross-platform)
		const { spawn } = await import('child_process');
		const platform = process.platform;

		let browserCommand: string;
		let browserArgs: string[];

		if (platform === 'darwin') {
			browserCommand = 'open';
			browserArgs = [loginUrl];
		} else if (platform === 'win32') {
			browserCommand = 'cmd';
			browserArgs = ['/c', 'start', loginUrl];
		} else {
			browserCommand = 'xdg-open';
			browserArgs = [loginUrl];
		}

		spawn(browserCommand, browserArgs, { detached: true, stdio: 'ignore' }).unref();

		console.log(chalk.dim(`Opening: ${loginUrl}\n`));
		console.log('Waiting for authentication...');
		console.log(chalk.dim('(Press Ctrl+C to cancel)\n'));

		// Wait for token with timeout (5 minutes)
		const timeout = 5 * 60 * 1000;
		const startTime = Date.now();

		while (!receivedToken && Date.now() - startTime < timeout) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Close server
		server.close();
		serverClosed = true;

		if (!receivedToken) {
			logError('Login timeout - no response received within 5 minutes');
			throw new Error('Login timeout - no response received within 5 minutes');
		}

		// Save token
		const spinner = startSpinner('Saving authentication token...');

		try {
			saveToken(receivedToken);
			succeedSpinner(spinner, 'Token saved successfully');
			console.log(chalk.dim(`  Location: ~/.databasin/.token\n`));
		} catch (error) {
			failSpinner(spinner, 'Failed to save token');
			if (error instanceof Error) {
				logError(error.message);
				throw error;
			}
			throw new Error('Failed to save token');
		}

		// Verify token if requested
		if (options.verify !== false) {
			const verifySpinner = startSpinner('Verifying token...');

			try {
				// Temporarily override token for verification
				process.env.DATABASIN_TOKEN = receivedToken;

				const isValid = await client.ping();

				if (isValid) {
					succeedSpinner(verifySpinner, 'Token verified successfully');

					// Try to get user info
					try {
						const user = await projectsClient.getCurrentUser();
						const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

						console.log(chalk.green('\n✓ Successfully authenticated!\n'));
						console.log(`  User: ${chalk.bold(user.email)}`);
						if (userName) {
							console.log(`  Name: ${userName}`);
						}

						if (user.organizationMemberships && user.organizationMemberships.length > 0) {
							const orgName = user.organizationMemberships[0].organizationName;
							if (orgName) {
								console.log(`  Organization: ${orgName}`);
							}
						}

						console.log();
					} catch (userError) {
						// Ping succeeded but couldn't get user - still OK
						console.log(chalk.green('\n✓ Successfully authenticated!\n'));
					}

					return;
				} else {
					failSpinner(verifySpinner, 'Token verification failed');
					console.error('  The token was saved but could not be verified.');
					console.error('  You may need to obtain a new token.');
					throw new Error('Token verification failed');
				}
			} catch (error) {
				failSpinner(verifySpinner, 'Token verification failed');
				if (error instanceof Error) {
					logError(error.message);
					throw error;
				}
				throw new Error('Token verification failed');
			}
		} else {
			console.log(chalk.green('\n✓ Login successful!\n'));
			return;
		}
	} catch (error) {
		if (!serverClosed) {
			// Ensure server is stopped on error
			console.log('\nShutting down local server...');
		}

		logError('Login failed');
		if (error instanceof Error) {
			console.error(error.message);
			if (config.debug && error.stack) {
				console.error(error.stack);
			}
			throw error;
		}
		throw new Error('Login failed');
	}
}
