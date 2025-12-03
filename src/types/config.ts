/**
 * CLI Configuration Type Definitions
 *
 * Defines configuration schema for the Databasin CLI tool.
 * Configuration is loaded from:
 * - Config file (~/.databasin/config.json)
 * - Environment variables
 * - Command-line flags (highest priority)
 */

/**
 * Output format options for CLI commands
 */
export type OutputFormat = 'table' | 'json' | 'csv';

/**
 * Log level options for CLI verbosity
 */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

/**
 * Complete CLI configuration schema
 * Stored in ~/.databasin/config.json
 */
export interface CliConfig {
	/**
	 * Databasin API base URL
	 * @default "http://localhost:9000"
	 * @example "https://api.databasin.com"
	 */
	apiUrl: string;

	/**
	 * Databasin Web UI base URL (for browser-based login)
	 * @default "http://localhost:3000"
	 * @example "https://starling.test.databasin.co"
	 */
	webUrl: string;

	/**
	 * Default project ID to use when not specified
	 * Can be numeric ID or internal ID (e.g., "N1r8Do")
	 * @example "N1r8Do"
	 */
	defaultProject?: string;

	/**
	 * Output format preferences
	 */
	output: {
		/**
		 * Default output format
		 * @default "table"
		 */
		format: OutputFormat;

		/**
		 * Enable colored output
		 * @default true
		 */
		colors: boolean;

		/**
		 * Enable verbose output
		 * @default false
		 */
		verbose: boolean;
	};

	/**
	 * Token efficiency settings
	 * Controls API response size to minimize token usage
	 */
	tokenEfficiency: {
		/**
		 * Default limit for list operations
		 * @default 100
		 */
		defaultLimit: number;

		/**
		 * Warn when response exceeds this many tokens
		 * @default 50000
		 */
		warnThreshold: number;
	};

	/**
	 * Request timeout in milliseconds
	 * @default 30000
	 */
	timeout: number;

	/**
	 * Enable debug logging
	 * @default false
	 */
	debug: boolean;
}

/**
 * Partial configuration for updates
 * All fields optional to allow selective updates
 */
export type PartialCliConfig = Partial<{
	apiUrl: string;
	webUrl: string;
	defaultProject: string;
	output: Partial<CliConfig['output']>;
	tokenEfficiency: Partial<CliConfig['tokenEfficiency']>;
	timeout: number;
	debug: boolean;
}>;

/**
 * Default configuration values
 * Used when no config file exists or values not set
 */
export const DEFAULT_CONFIG: CliConfig = {
	apiUrl: 'http://localhost:9000',
	webUrl: 'http://localhost:3000',
	output: {
		format: 'table',
		colors: true,
		verbose: false
	},
	tokenEfficiency: {
		defaultLimit: 100,
		warnThreshold: 50000
	},
	timeout: 30000,
	debug: false
};

/**
 * Environment variable names
 * Used to override config file settings
 */
export const ENV_VARS = {
	/** API base URL override */
	API_URL: 'DATABASIN_API_URL',

	/** Web UI base URL override */
	WEB_URL: 'DATABASIN_WEB_URL',

	/** JWT authentication token */
	TOKEN: 'DATABASIN_TOKEN',

	/** Default project override */
	DEFAULT_PROJECT: 'DATABASIN_DEFAULT_PROJECT',

	/** Debug mode toggle */
	DEBUG: 'DATABASIN_DEBUG',

	/** Config file location override */
	CONFIG_PATH: 'DATABASIN_CONFIG_PATH',

	/** Request timeout override (in seconds) */
	TIMEOUT: 'DATABASIN_TIMEOUT',

	/** Output format override */
	OUTPUT_FORMAT: 'DATABASIN_OUTPUT_FORMAT',

	/** Disable colors */
	NO_COLOR: 'NO_COLOR'
} as const;

/**
 * Configuration file paths
 * Platform-specific locations for config storage
 */
export interface ConfigPaths {
	/** Main config file location */
	configFile: string;

	/** Token cache file location */
	tokenFile: string;

	/** User context cache location */
	cacheDir: string;
}

/**
 * Get platform-specific config paths
 * @returns Configuration file paths
 */
export function getConfigPaths(): ConfigPaths {
	const home = process.env.HOME || process.env.USERPROFILE || '';
	const configDir = `${home}/.databasin`;

	return {
		configFile: `${configDir}/config.json`,
		tokenFile: `${configDir}/token`,
		cacheDir: `${configDir}/cache`
	};
}

/**
 * Validate configuration object
 * @param config Configuration to validate
 * @returns Validation result
 */
export function validateConfig(config: unknown): config is CliConfig {
	if (!config || typeof config !== 'object') {
		return false;
	}

	const cfg = config as any;

	// Required fields
	if (typeof cfg.apiUrl !== 'string') {
		return false;
	}
	if (typeof cfg.webUrl !== 'string') {
		return false;
	}

	// Output configuration
	if (!cfg.output || typeof cfg.output !== 'object') {
		return false;
	}
	if (!['table', 'json', 'csv'].includes(cfg.output.format)) {
		return false;
	}
	if (typeof cfg.output.colors !== 'boolean') {
		return false;
	}
	if (typeof cfg.output.verbose !== 'boolean') {
		return false;
	}

	// Token efficiency
	if (!cfg.tokenEfficiency || typeof cfg.tokenEfficiency !== 'object') {
		return false;
	}
	if (typeof cfg.tokenEfficiency.defaultLimit !== 'number') {
		return false;
	}
	if (typeof cfg.tokenEfficiency.warnThreshold !== 'number') {
		return false;
	}

	// Other required fields
	if (typeof cfg.timeout !== 'number') {
		return false;
	}
	if (typeof cfg.debug !== 'boolean') {
		return false;
	}

	return true;
}

/**
 * Merge multiple configuration sources
 * Priority: CLI flags > Environment > Config file > Defaults
 *
 * @param sources Array of config sources (lowest to highest priority)
 * @returns Merged configuration
 */
export function mergeConfigs(...sources: PartialCliConfig[]): CliConfig {
	const merged: CliConfig = { ...DEFAULT_CONFIG };

	for (const source of sources) {
		if (source.apiUrl !== undefined) {
			merged.apiUrl = source.apiUrl;
		}
		if (source.webUrl !== undefined) {
			merged.webUrl = source.webUrl;
		}
		if (source.defaultProject !== undefined) {
			merged.defaultProject = source.defaultProject;
		}
		if (source.output) {
			merged.output = { ...merged.output, ...source.output };
		}
		if (source.tokenEfficiency) {
			merged.tokenEfficiency = { ...merged.tokenEfficiency, ...source.tokenEfficiency };
		}
		if (source.timeout !== undefined) {
			merged.timeout = source.timeout;
		}
		if (source.debug !== undefined) {
			merged.debug = source.debug;
		}
	}

	return merged;
}

/**
 * Parse environment variables into config
 * @returns Partial configuration from environment
 */
export function configFromEnv(): PartialCliConfig {
	const config: PartialCliConfig = {};

	if (process.env[ENV_VARS.API_URL]) {
		config.apiUrl = process.env[ENV_VARS.API_URL];
	}

	if (process.env[ENV_VARS.WEB_URL]) {
		config.webUrl = process.env[ENV_VARS.WEB_URL];
	}

	if (process.env[ENV_VARS.DEFAULT_PROJECT]) {
		config.defaultProject = process.env[ENV_VARS.DEFAULT_PROJECT];
	}

	if (process.env[ENV_VARS.DEBUG]) {
		config.debug = process.env[ENV_VARS.DEBUG] === 'true';
	}

	if (process.env[ENV_VARS.TIMEOUT]) {
		const timeoutStr = process.env[ENV_VARS.TIMEOUT];
		if (timeoutStr) {
			const timeout = parseInt(timeoutStr, 10);
			if (!isNaN(timeout)) {
				config.timeout = timeout * 1000; // Convert seconds to milliseconds
			}
		}
	}

	if (process.env[ENV_VARS.OUTPUT_FORMAT]) {
		const format = process.env[ENV_VARS.OUTPUT_FORMAT];
		if (format === 'table' || format === 'json' || format === 'csv') {
			config.output = { format };
		}
	}

	if (process.env[ENV_VARS.NO_COLOR]) {
		config.output = { ...config.output, colors: false };
	}

	return config;
}
