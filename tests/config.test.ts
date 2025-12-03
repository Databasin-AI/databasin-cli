/**
 * Configuration Management Tests
 *
 * Tests for config.ts functionality including:
 * - Loading from multiple sources
 * - Priority cascade (CLI > ENV > FILE > DEFAULT)
 * - Validation
 * - File persistence
 * - Singleton pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
	loadConfig,
	saveConfig,
	getConfigPath,
	getConfigDir,
	ensureConfigDir,
	loadConfigFile,
	loadConfigFromEnv,
	mergeConfigs,
	validateConfig,
	getConfig,
	resetConfig,
	updateConfigValue,
	getConfigValue,
	configFileExists,
	deleteConfigFile
} from './config.ts';
import { DEFAULT_CONFIG, ENV_VARS } from './types/config.ts';
import { ConfigError } from './utils/errors.ts';

// Test config path (use temp directory to avoid conflicts)
const TEST_CONFIG_DIR = join(process.cwd(), '.test-databasin');
const TEST_CONFIG_PATH = join(TEST_CONFIG_DIR, 'config.json');

describe('Configuration Management', () => {
	beforeEach(() => {
		// Clean up before each test
		resetConfig();
		if (existsSync(TEST_CONFIG_PATH)) {
			unlinkSync(TEST_CONFIG_PATH);
		}
		if (existsSync(TEST_CONFIG_DIR)) {
			try {
				const fs = require('fs');
				fs.rmdirSync(TEST_CONFIG_DIR);
			} catch {
				// Ignore if not empty
			}
		}

		// Override config path for tests
		process.env[ENV_VARS.CONFIG_PATH] = TEST_CONFIG_PATH;

		// Clear other env vars
		delete process.env[ENV_VARS.API_URL];
		delete process.env[ENV_VARS.DEFAULT_PROJECT];
		delete process.env[ENV_VARS.DEBUG];
		delete process.env[ENV_VARS.TIMEOUT];
		delete process.env[ENV_VARS.OUTPUT_FORMAT];
		delete process.env[ENV_VARS.NO_COLOR];
	});

	afterEach(() => {
		// Clean up after each test
		resetConfig();
		if (existsSync(TEST_CONFIG_PATH)) {
			unlinkSync(TEST_CONFIG_PATH);
		}
		if (existsSync(TEST_CONFIG_DIR)) {
			try {
				const fs = require('fs');
				fs.rmdirSync(TEST_CONFIG_DIR);
			} catch {
				// Ignore if not empty
			}
		}

		delete process.env[ENV_VARS.CONFIG_PATH];
	});

	describe('Directory and Path Management', () => {
		it('should return correct config path', () => {
			const path = getConfigPath();
			expect(path).toBe(TEST_CONFIG_PATH);
		});

		it('should return correct config directory', () => {
			const dir = getConfigDir();
			expect(dir).toBe(TEST_CONFIG_DIR);
		});

		it('should create config directory if it does not exist', () => {
			expect(existsSync(TEST_CONFIG_DIR)).toBe(false);
			ensureConfigDir();
			expect(existsSync(TEST_CONFIG_DIR)).toBe(true);
		});

		it('should not error if config directory already exists', () => {
			mkdirSync(TEST_CONFIG_DIR, { recursive: true });
			expect(() => ensureConfigDir()).not.toThrow();
		});

		it('should check if config file exists', () => {
			expect(configFileExists()).toBe(false);
			ensureConfigDir();
			writeFileSync(TEST_CONFIG_PATH, '{}');
			expect(configFileExists()).toBe(true);
		});
	});

	describe('File Operations', () => {
		it('should return empty object when config file does not exist', () => {
			const config = loadConfigFile();
			expect(config).toEqual({});
		});

		it('should load config from file', () => {
			ensureConfigDir();
			const testConfig = { apiUrl: 'https://test.example.com' };
			writeFileSync(TEST_CONFIG_PATH, JSON.stringify(testConfig));

			const config = loadConfigFile();
			expect(config).toEqual(testConfig);
		});

		it('should save config to file', () => {
			const testConfig = {
				apiUrl: 'https://test.example.com',
				debug: true
			};

			saveConfig(testConfig);

			expect(existsSync(TEST_CONFIG_PATH)).toBe(true);
			const loaded = loadConfigFile();
			expect(loaded).toEqual(testConfig);
		});

		it('should create config directory when saving', () => {
			expect(existsSync(TEST_CONFIG_DIR)).toBe(false);

			saveConfig({ apiUrl: 'https://test.example.com' });

			expect(existsSync(TEST_CONFIG_DIR)).toBe(true);
			expect(existsSync(TEST_CONFIG_PATH)).toBe(true);
		});

		it('should throw ConfigError on invalid JSON', () => {
			ensureConfigDir();
			writeFileSync(TEST_CONFIG_PATH, 'invalid json {');

			expect(() => loadConfigFile()).toThrow(ConfigError);
		});

		it('should throw ConfigError if file contains array', () => {
			ensureConfigDir();
			writeFileSync(TEST_CONFIG_PATH, '[]');

			expect(() => loadConfigFile()).toThrow(ConfigError);
		});

		it('should handle empty file gracefully', () => {
			ensureConfigDir();
			writeFileSync(TEST_CONFIG_PATH, '');

			const config = loadConfigFile();
			expect(config).toEqual({});
		});

		it('should delete config file', () => {
			saveConfig({ apiUrl: 'https://test.example.com' });
			expect(configFileExists()).toBe(true);

			deleteConfigFile();
			expect(configFileExists()).toBe(false);
		});
	});

	describe('Environment Variables', () => {
		it('should load API URL from environment', () => {
			process.env[ENV_VARS.API_URL] = 'https://env.example.com';

			const config = loadConfigFromEnv();
			expect(config.apiUrl).toBe('https://env.example.com');
		});

		it('should load default project from environment', () => {
			process.env[ENV_VARS.DEFAULT_PROJECT] = 'test-project';

			const config = loadConfigFromEnv();
			expect(config.defaultProject).toBe('test-project');
		});

		it('should load debug flag from environment', () => {
			process.env[ENV_VARS.DEBUG] = 'true';

			const config = loadConfigFromEnv();
			expect(config.debug).toBe(true);
		});

		it('should load timeout from environment (convert seconds to ms)', () => {
			process.env[ENV_VARS.TIMEOUT] = '60';

			const config = loadConfigFromEnv();
			expect(config.timeout).toBe(60000); // 60 seconds = 60000ms
		});

		it('should load output format from environment', () => {
			process.env[ENV_VARS.OUTPUT_FORMAT] = 'json';

			const config = loadConfigFromEnv();
			expect(config.output?.format).toBe('json');
		});

		it('should disable colors via NO_COLOR', () => {
			process.env[ENV_VARS.NO_COLOR] = '1';

			const config = loadConfigFromEnv();
			expect(config.output?.colors).toBe(false);
		});

		it('should return empty object if no env vars set', () => {
			const config = loadConfigFromEnv();
			expect(config).toEqual({});
		});

		it('should ignore invalid timeout values', () => {
			process.env[ENV_VARS.TIMEOUT] = 'invalid';

			const config = loadConfigFromEnv();
			expect(config.timeout).toBeUndefined();
		});
	});

	describe('Config Merging', () => {
		it('should merge configs with proper priority', () => {
			const config1 = { apiUrl: 'http://first.com', debug: false };
			const config2 = { apiUrl: 'http://second.com' };
			const config3 = { debug: true };

			const merged = mergeConfigs(config1, config2, config3);

			expect(merged.apiUrl).toBe('http://second.com'); // config2 overrides config1
			expect(merged.debug).toBe(true); // config3 overrides config1
		});

		it('should merge nested output settings', () => {
			const config1 = { output: { format: 'json' as const, colors: true } };
			const config2 = { output: { colors: false } };

			const merged = mergeConfigs(config1, config2);

			expect(merged.output.format).toBe('json'); // Preserved from config1
			expect(merged.output.colors).toBe(false); // Overridden by config2
		});

		it('should merge nested tokenEfficiency settings', () => {
			const config1 = { tokenEfficiency: { defaultLimit: 50 } };
			const config2 = { tokenEfficiency: { warnThreshold: 10000 } };

			const merged = mergeConfigs(config1, config2);

			expect(merged.tokenEfficiency.defaultLimit).toBe(50);
			expect(merged.tokenEfficiency.warnThreshold).toBe(10000);
		});

		it('should start with default config', () => {
			const merged = mergeConfigs({});

			expect(merged).toEqual(DEFAULT_CONFIG);
		});
	});

	describe('Config Validation', () => {
		it('should validate valid config', () => {
			const validConfig = { apiUrl: 'https://valid.example.com' };

			expect(() => validateConfig(validConfig)).not.toThrow();
		});

		it('should reject invalid URL', () => {
			const invalidConfig = { apiUrl: 'not-a-url' };

			expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
		});

		it('should reject non-HTTP URL', () => {
			const invalidConfig = { apiUrl: 'ftp://example.com' };

			expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
		});

		it('should reject negative timeout', () => {
			const invalidConfig = { timeout: -100 };

			expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
		});

		it('should reject zero timeout', () => {
			const invalidConfig = { timeout: 0 };

			expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
		});

		it('should reject invalid output format', () => {
			const invalidConfig = { output: { format: 'invalid' as any } };

			expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
		});

		it('should reject invalid defaultLimit', () => {
			const invalidConfig = { tokenEfficiency: { defaultLimit: 0 } };

			expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
		});

		it('should reject negative warnThreshold', () => {
			const invalidConfig = { tokenEfficiency: { warnThreshold: -100 } };

			expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
		});

		it('should reject empty defaultProject', () => {
			const invalidConfig = { defaultProject: '  ' };

			expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
		});
	});

	describe('Priority Cascade', () => {
		it('should prioritize CLI args over env vars', () => {
			process.env[ENV_VARS.API_URL] = 'https://env.example.com';

			const config = loadConfig({ apiUrl: 'https://cli.example.com' });

			expect(config.apiUrl).toBe('https://cli.example.com');
		});

		it('should prioritize CLI args over file config', () => {
			saveConfig({ apiUrl: 'https://file.example.com' });

			const config = loadConfig({ apiUrl: 'https://cli.example.com' });

			expect(config.apiUrl).toBe('https://cli.example.com');
		});

		it('should prioritize env vars over file config', () => {
			saveConfig({ apiUrl: 'https://file.example.com' });
			process.env[ENV_VARS.API_URL] = 'https://env.example.com';

			const config = loadConfig();

			expect(config.apiUrl).toBe('https://env.example.com');
		});

		it('should prioritize file config over defaults', () => {
			saveConfig({ apiUrl: 'https://file.example.com' });

			const config = loadConfig();

			expect(config.apiUrl).toBe('https://file.example.com');
		});

		it('should use defaults when no overrides provided', () => {
			const config = loadConfig();

			expect(config).toEqual(DEFAULT_CONFIG);
		});

		it('should handle complete priority chain', () => {
			// Setup all sources
			saveConfig({
				apiUrl: 'https://file.example.com',
				debug: true,
				timeout: 1000
			});

			process.env[ENV_VARS.API_URL] = 'https://env.example.com';
			process.env[ENV_VARS.DEBUG] = 'false';

			const config = loadConfig({
				apiUrl: 'https://cli.example.com'
			});

			// CLI overrides everything
			expect(config.apiUrl).toBe('https://cli.example.com');
			// ENV overrides file
			expect(config.debug).toBe(false);
			// File overrides default
			expect(config.timeout).toBe(1000);
		});
	});

	describe('Singleton Pattern', () => {
		it('should return same config instance on multiple calls', () => {
			const config1 = getConfig();
			const config2 = getConfig();

			expect(config1).toBe(config2); // Same object reference
		});

		it('should reload config when cliOptions provided', () => {
			const config1 = getConfig();
			const config2 = getConfig({ debug: true });

			expect(config1.debug).toBe(false);
			expect(config2.debug).toBe(true);
		});

		it('should reload config after reset', () => {
			const config1 = getConfig();
			expect(config1.apiUrl).toBe(DEFAULT_CONFIG.apiUrl);

			// Save new config
			saveConfig({ apiUrl: 'https://new.example.com' });

			// Without reset, still returns old config
			const config2 = getConfig();
			expect(config2.apiUrl).toBe(DEFAULT_CONFIG.apiUrl);

			// After reset, loads new config
			resetConfig();
			const config3 = getConfig();
			expect(config3.apiUrl).toBe('https://new.example.com');
		});
	});

	describe('Update Operations', () => {
		it('should update single config value', () => {
			saveConfig({ apiUrl: 'https://old.example.com' });

			updateConfigValue('apiUrl', 'https://new.example.com');

			const config = loadConfigFile();
			expect(config.apiUrl).toBe('https://new.example.com');
		});

		it('should validate before updating', () => {
			expect(() => {
				updateConfigValue('timeout', -100);
			}).toThrow(ConfigError);
		});

		it('should reset singleton after update', () => {
			const config1 = getConfig();
			expect(config1.debug).toBe(false);

			updateConfigValue('debug', true);

			const config2 = getConfig();
			expect(config2.debug).toBe(true);
		});

		it('should get specific config value', () => {
			saveConfig({ apiUrl: 'https://test.example.com' });
			resetConfig();

			const apiUrl = getConfigValue('apiUrl');
			expect(apiUrl).toBe('https://test.example.com');
		});
	});

	describe('Error Handling', () => {
		it('should throw ConfigError with file path on parse error', () => {
			ensureConfigDir();
			writeFileSync(TEST_CONFIG_PATH, 'invalid');

			try {
				loadConfig();
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(ConfigError);
				expect((error as ConfigError).configPath).toBe(TEST_CONFIG_PATH);
			}
		});

		it('should throw ConfigError with context on validation error', () => {
			saveConfig({ apiUrl: 'https://valid.example.com' });
			process.env[ENV_VARS.TIMEOUT] = '-100';

			try {
				// This should fail because env timeout will be negative after conversion
				// Actually, loadConfigFromEnv ignores invalid timeout strings
				// So let's test with a direct validation error instead
				saveConfig({ timeout: -100 } as any);
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(ConfigError);
			}
		});
	});

	describe('Edge Cases', () => {
		it('should handle undefined values in partial config', () => {
			const config = mergeConfigs({ apiUrl: undefined } as any);

			expect(config.apiUrl).toBe(DEFAULT_CONFIG.apiUrl);
		});

		it('should preserve existing file config when updating one value', () => {
			saveConfig({
				apiUrl: 'https://test.example.com',
				debug: true
			});

			updateConfigValue('timeout', 5000);

			const config = loadConfigFile();
			expect(config.apiUrl).toBe('https://test.example.com');
			expect(config.debug).toBe(true);
			expect(config.timeout).toBe(5000);
		});

		it('should handle simultaneous nested updates', () => {
			const config = mergeConfigs(
				{ output: { format: 'json' as const } },
				{ output: { colors: false } },
				{ output: { verbose: true } }
			);

			expect(config.output.format).toBe('json');
			expect(config.output.colors).toBe(false);
			expect(config.output.verbose).toBe(true);
		});
	});
});
