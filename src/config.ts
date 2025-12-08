/**
 * Configuration Management for Databasin CLI
 *
 * Manages CLI configuration with priority cascade:
 * 1. CLI arguments (highest priority)
 * 2. Environment variables
 * 3. Config file (~/.databasin/config.json)
 * 4. Default values (lowest priority)
 *
 * Provides file-based persistence, validation, and singleton pattern for
 * consistent configuration access throughout the CLI.
 *
 * @module config
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { CliConfig, PartialCliConfig, OutputFormat } from './types/config.ts';
import { DEFAULT_CONFIG, ENV_VARS } from './types/config.ts';
import { ConfigError } from './utils/errors.ts';

/**
 * Get the config file path
 *
 * Returns the path to the CLI configuration file in the user's home directory.
 * Can be overridden by DATABASIN_CONFIG_PATH environment variable.
 *
 * @returns Absolute path to config.json file
 */
export function getConfigPath(): string {
	// Allow override via environment variable
	const override = process.env[ENV_VARS.CONFIG_PATH];
	if (override !== undefined && override !== '') {
		return override;
	}

	return join(homedir(), '.databasin', 'config.json');
}

/**
 * Get the config directory path
 *
 * Returns the path to the CLI configuration directory in the user's home directory.
 *
 * @returns Absolute path to .databasin directory
 */
export function getConfigDir(): string {
	// If config path is overridden, use its directory
	const override = process.env[ENV_VARS.CONFIG_PATH];
	if (override !== undefined && override !== '') {
		const lastSlash = override.lastIndexOf('/');
		return lastSlash > 0 ? override.substring(0, lastSlash) : override;
	}

	return join(homedir(), '.databasin');
}

/**
 * Ensure the config directory exists
 *
 * Creates the config directory with secure permissions (0700) if it doesn't exist.
 * Throws ConfigError if directory creation fails.
 *
 * @throws {ConfigError} If directory creation fails
 */
export function ensureConfigDir(): void {
	const dir = getConfigDir();

	if (!existsSync(dir)) {
		try {
			mkdirSync(dir, { recursive: true, mode: 0o700 });
		} catch (error) {
			throw new ConfigError(
				`Failed to create config directory: ${error instanceof Error ? error.message : String(error)}`,
				dir
			);
		}
	}
}

/**
 * Load config from file
 *
 * Reads and parses the config file. Returns empty object if file doesn't exist.
 * Throws ConfigError if file exists but cannot be parsed.
 *
 * @returns Partial configuration from file (empty object if file doesn't exist)
 * @throws {ConfigError} If file exists but cannot be read or parsed
 */
export function loadConfigFile(): PartialCliConfig {
	const path = getConfigPath();

	if (!existsSync(path)) {
		return {};
	}

	try {
		const content = readFileSync(path, 'utf-8');

		// Handle empty file
		if (!content.trim()) {
			return {};
		}

		const parsed = JSON.parse(content);

		// Ensure we have an object
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new ConfigError('Config file must contain a JSON object', path);
		}

		return parsed;
	} catch (error) {
		if (error instanceof ConfigError) {
			throw error;
		}

		throw new ConfigError(
			`Failed to parse config file: ${error instanceof Error ? error.message : String(error)}`,
			path
		);
	}
}

/**
 * Save config to file
 *
 * Writes configuration to the config file with secure permissions (0600).
 * Creates config directory if it doesn't exist.
 * Validates config before saving.
 *
 * @param config - Partial configuration to save
 * @throws {ConfigError} If config is invalid or cannot be saved
 */
export function saveConfig(config: PartialCliConfig): void {
	// Validate before saving
	validateConfig(config);

	ensureConfigDir();
	const path = getConfigPath();

	try {
		const content = JSON.stringify(config, null, 2) + '\n';
		writeFileSync(path, content, { mode: 0o600 });
	} catch (error) {
		throw new ConfigError(
			`Failed to save config file: ${error instanceof Error ? error.message : String(error)}`,
			path
		);
	}
}

/**
 * Load config from environment variables
 *
 * Reads configuration values from environment variables with DATABASIN_ prefix.
 * Environment variables override config file but are overridden by CLI args.
 *
 * @returns Partial configuration from environment variables
 */
export function loadConfigFromEnv(): PartialCliConfig {
	const config: PartialCliConfig = {};

	// API URL
	if (process.env[ENV_VARS.API_URL]) {
		config.apiUrl = process.env[ENV_VARS.API_URL];
	}

	// Web URL
	if (process.env[ENV_VARS.WEB_URL]) {
		config.webUrl = process.env[ENV_VARS.WEB_URL];
	}

	// Default project
	if (process.env[ENV_VARS.DEFAULT_PROJECT]) {
		config.defaultProject = process.env[ENV_VARS.DEFAULT_PROJECT];
	}

	// Debug mode
	if (process.env[ENV_VARS.DEBUG]) {
		config.debug = process.env[ENV_VARS.DEBUG] === 'true';
	}

	// Timeout (convert seconds to milliseconds)
	if (process.env[ENV_VARS.TIMEOUT]) {
		const timeoutStr = process.env[ENV_VARS.TIMEOUT];
		if (timeoutStr) {
			const timeout = parseInt(timeoutStr, 10);
			if (!isNaN(timeout) && timeout > 0) {
				config.timeout = timeout * 1000;
			}
		}
	}

	// Output format
	if (process.env[ENV_VARS.OUTPUT_FORMAT]) {
		const format = process.env[ENV_VARS.OUTPUT_FORMAT];
		if (format === 'table' || format === 'json' || format === 'csv') {
			config.output = { format };
		}
	}

	// Disable colors (NO_COLOR is a standard convention)
	if (process.env[ENV_VARS.NO_COLOR]) {
		config.output = { ...config.output, colors: false };
	}

	// Disable update checks
	if (process.env[ENV_VARS.NO_UPDATE_CHECK] === 'true' || process.env[ENV_VARS.NO_UPDATE_CHECK] === '1') {
		config.noUpdateCheck = true;
	}

	return config;
}

/**
 * Merge multiple configs with priority
 *
 * Merges configuration objects from multiple sources.
 * Later configs in the array override earlier ones.
 * Handles nested objects (output, tokenEfficiency) properly.
 *
 * Priority order: DEFAULT < FILE < ENV < CLI
 *
 * @param configs - Array of partial configs to merge (lower to higher priority)
 * @returns Complete merged configuration
 */
export function mergeConfigs(...configs: PartialCliConfig[]): CliConfig {
	let result: CliConfig = { ...DEFAULT_CONFIG };

	for (const config of configs) {
		// Top-level primitives
		if (config.apiUrl !== undefined) {
			result.apiUrl = config.apiUrl;
		}
		if (config.webUrl !== undefined) {
			result.webUrl = config.webUrl;
		}
		if (config.defaultProject !== undefined) {
			result.defaultProject = config.defaultProject;
		}
		if (config.timeout !== undefined) {
			result.timeout = config.timeout;
		}
		if (config.debug !== undefined) {
			result.debug = config.debug;
		}
		if (config.noUpdateCheck !== undefined) {
			result.noUpdateCheck = config.noUpdateCheck;
		}

		// Nested: output settings
		if (config.output) {
			result.output = { ...result.output, ...config.output };
		}

		// Nested: tokenEfficiency settings
		if (config.tokenEfficiency) {
			result.tokenEfficiency = {
				...result.tokenEfficiency,
				...config.tokenEfficiency
			};
		}
	}

	return result;
}

/**
 * Validate configuration
 *
 * Validates a partial or complete configuration object.
 * Throws ConfigError if validation fails with specific error messages.
 *
 * Validates:
 * - API URL format (must be valid HTTP/HTTPS URL)
 * - Timeout value (must be positive number)
 * - Output format (must be 'table', 'json', or 'csv')
 * - Token efficiency settings (must be positive numbers)
 *
 * @param config - Configuration to validate
 * @throws {ConfigError} If configuration is invalid
 */
export function validateConfig(config: PartialCliConfig): void {
	// Validate API URL
	if (config.apiUrl !== undefined) {
		if (typeof config.apiUrl !== 'string') {
			throw new ConfigError('API URL must be a string');
		}

		try {
			const url = new URL(config.apiUrl);
			if (!url.protocol.startsWith('http')) {
				throw new ConfigError('API URL must use HTTP or HTTPS protocol');
			}
		} catch (error) {
			if (error instanceof ConfigError) {
				throw error;
			}
			throw new ConfigError('Invalid API URL: must be a valid HTTP(S) URL');
		}
	}

	// Validate timeout
	if (config.timeout !== undefined) {
		if (typeof config.timeout !== 'number') {
			throw new ConfigError('Timeout must be a number');
		}
		if (config.timeout < 0) {
			throw new ConfigError('Timeout must be a positive number (milliseconds)');
		}
		if (config.timeout === 0) {
			throw new ConfigError('Timeout must be greater than 0');
		}
	}

	// Validate output settings
	if (config.output) {
		if (typeof config.output !== 'object') {
			throw new ConfigError('Output settings must be an object');
		}

		if (config.output.format !== undefined) {
			const validFormats: OutputFormat[] = ['table', 'json', 'csv'];
			if (!validFormats.includes(config.output.format)) {
				throw new ConfigError(`Invalid output format: must be one of ${validFormats.join(', ')}`);
			}
		}

		if (config.output.colors !== undefined && typeof config.output.colors !== 'boolean') {
			throw new ConfigError('Output colors setting must be a boolean');
		}

		if (config.output.verbose !== undefined && typeof config.output.verbose !== 'boolean') {
			throw new ConfigError('Output verbose setting must be a boolean');
		}
	}

	// Validate token efficiency settings
	if (config.tokenEfficiency) {
		if (typeof config.tokenEfficiency !== 'object') {
			throw new ConfigError('Token efficiency settings must be an object');
		}

		if (config.tokenEfficiency.defaultLimit !== undefined) {
			if (typeof config.tokenEfficiency.defaultLimit !== 'number') {
				throw new ConfigError('Token efficiency defaultLimit must be a number');
			}
			if (config.tokenEfficiency.defaultLimit < 1) {
				throw new ConfigError('Token efficiency defaultLimit must be at least 1');
			}
		}

		if (config.tokenEfficiency.warnThreshold !== undefined) {
			if (typeof config.tokenEfficiency.warnThreshold !== 'number') {
				throw new ConfigError('Token efficiency warnThreshold must be a number');
			}
			if (config.tokenEfficiency.warnThreshold < 0) {
				throw new ConfigError('Token efficiency warnThreshold must be a positive number');
			}
		}
	}

	// Validate debug flag
	if (config.debug !== undefined && typeof config.debug !== 'boolean') {
		throw new ConfigError('Debug setting must be a boolean');
	}

	// Validate noUpdateCheck flag
	if (config.noUpdateCheck !== undefined && typeof config.noUpdateCheck !== 'boolean') {
		throw new ConfigError('noUpdateCheck setting must be a boolean');
	}

	// Validate defaultProject
	if (config.defaultProject !== undefined) {
		if (typeof config.defaultProject !== 'string') {
			throw new ConfigError('Default project must be a string');
		}
		if (config.defaultProject.trim() === '') {
			throw new ConfigError('Default project cannot be empty');
		}
	}
}

/**
 * Load complete config from all sources with proper priority
 *
 * Loads configuration from all sources and merges them with proper priority:
 * 1. Default values (lowest priority)
 * 2. Config file
 * 3. Environment variables
 * 4. CLI options (highest priority)
 *
 * Each source is validated before merging to catch errors early.
 *
 * @param cliOptions - Optional CLI options to merge (highest priority)
 * @returns Complete merged and validated configuration
 * @throws {ConfigError} If any configuration source is invalid
 */
export function loadConfig(cliOptions: PartialCliConfig = {}): CliConfig {
	// Load from all sources
	const fileConfig = loadConfigFile();
	const envConfig = loadConfigFromEnv();

	// Validate individual configs before merging
	// This provides better error messages than validating after merge
	try {
		validateConfig(fileConfig);
	} catch (error) {
		if (error instanceof ConfigError) {
			throw new ConfigError(`Invalid config file: ${error.message}`, getConfigPath());
		}
		throw error;
	}

	try {
		validateConfig(envConfig);
	} catch (error) {
		if (error instanceof ConfigError) {
			throw new ConfigError(`Invalid environment variable: ${error.message}`);
		}
		throw error;
	}

	try {
		validateConfig(cliOptions);
	} catch (error) {
		if (error instanceof ConfigError) {
			throw new ConfigError(`Invalid CLI option: ${error.message}`);
		}
		throw error;
	}

	// Merge with proper priority: DEFAULT < FILE < ENV < CLI
	const merged = mergeConfigs(fileConfig, envConfig, cliOptions);

	return merged;
}

/**
 * Singleton instance for current configuration
 *
 * Holds the currently active configuration. Null until first load.
 * Reset this to null to force reload on next getConfig() call.
 */
let currentConfig: CliConfig | null = null;

/**
 * Get or initialize the current configuration
 *
 * Returns the current active configuration, loading it if necessary.
 * Uses singleton pattern to avoid repeated file I/O.
 *
 * If cliOptions are provided, forces a reload with new options.
 * Otherwise returns cached config or loads from all sources.
 *
 * @param cliOptions - Optional CLI options to merge (forces reload)
 * @returns Current active configuration
 * @throws {ConfigError} If configuration is invalid
 */
export function getConfig(cliOptions?: PartialCliConfig): CliConfig {
	if (!currentConfig || cliOptions) {
		currentConfig = loadConfig(cliOptions);
	}
	return currentConfig;
}

/**
 * Reset config singleton
 *
 * Clears the cached configuration, forcing a reload on next getConfig() call.
 * Useful for testing or when configuration files change.
 */
export function resetConfig(): void {
	currentConfig = null;
}

/**
 * Update a specific config value and save to file
 *
 * Updates a single configuration value in the config file.
 * Loads current file config, updates the specified field, validates,
 * saves to file, and resets the singleton to force reload.
 *
 * Note: This only updates the config file, not environment variables or CLI args.
 *
 * @param key - Configuration key to update
 * @param value - New value for the key
 * @throws {ConfigError} If update would create invalid configuration
 */
export function updateConfigValue<K extends keyof CliConfig>(key: K, value: CliConfig[K]): void {
	// Load current file config
	const fileConfig = loadConfigFile();

	// Update the value
	(fileConfig as any)[key] = value;

	// Validate before saving
	validateConfig(fileConfig);

	// Save to file
	saveConfig(fileConfig);

	// Force reload on next getConfig()
	resetConfig();
}

/**
 * Get a specific config value
 *
 * Retrieves a single configuration value from the current active config.
 * Useful for accessing config values without destructuring the entire config.
 *
 * @param key - Configuration key to retrieve
 * @returns Value for the specified key
 */
export function getConfigValue<K extends keyof CliConfig>(key: K): CliConfig[K] {
	const config = getConfig();
	return config[key];
}

/**
 * Check if config file exists
 *
 * @returns True if config file exists, false otherwise
 */
export function configFileExists(): boolean {
	return existsSync(getConfigPath());
}

/**
 * Delete config file
 *
 * Removes the config file and resets the singleton.
 * Useful for resetting to defaults or cleaning up.
 *
 * @throws {ConfigError} If file deletion fails
 */
export function deleteConfigFile(): void {
	const path = getConfigPath();

	if (!existsSync(path)) {
		return; // Already deleted
	}

	try {
		const fs = require('fs');
		fs.unlinkSync(path);
		resetConfig();
	} catch (error) {
		throw new ConfigError(
			`Failed to delete config file: ${error instanceof Error ? error.message : String(error)}`,
			path
		);
	}
}
