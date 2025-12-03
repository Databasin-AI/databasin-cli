/**
 * Simplified tests for Base API Client
 *
 * Quick smoke tests to verify core functionality works.
 * Full integration tests will be run separately.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { DataBasinClient, createClient } from '../../src/client/base.ts';
import { loadConfig } from '../../src/config.ts';
import type { CliConfig } from '../../src/types/config.ts';

describe('DataBasinClient - Core Functionality', () => {
	beforeEach(() => {
		process.env.DATABASIN_TOKEN = 'test-jwt-token';
	});

	afterEach(() => {
		delete process.env.DATABASIN_TOKEN;
	});

	describe('Constructor and Factory', () => {
		it('should create client with full config', () => {
			const config = loadConfig({ apiUrl: 'https://api.test.databasin.ai', timeout: 5000 });
			const client = new DataBasinClient(config);
			expect(client.getBaseUrl()).toBe('https://api.test.databasin.ai');
		});

		it('should create client via factory function with full config', () => {
			const config = loadConfig({ apiUrl: 'https://api.test.databasin.ai' });
			const client = createClient(config);
			expect(client).toBeInstanceOf(DataBasinClient);
			expect(client.getBaseUrl()).toBe('https://api.test.databasin.ai');
		});

		it('should create client with default config when none provided', () => {
			const client = createClient();
			expect(client).toBeInstanceOf(DataBasinClient);
			expect(client.getBaseUrl()).toBeDefined();
		});
	});

	describe('URL Building', () => {
		it('should set and get base URL', () => {
			const client = createClient();
			client.setBaseUrl('https://api.production.databasin.ai');
			expect(client.getBaseUrl()).toBe('https://api.production.databasin.ai');
		});
	});

	describe('Token Management', () => {
		it('should clear cached token', () => {
			const client = createClient();
			client.clearToken();
			// No error thrown
		});
	});

	describe('Token Efficiency', () => {
		it('should create client instance', () => {
			const client = createClient();
			expect(client).toBeInstanceOf(DataBasinClient);
		});
	});
});
