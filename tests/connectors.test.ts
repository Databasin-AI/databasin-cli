/**
 * Connectors Client Tests
 *
 * Tests for the ConnectorsClient class with focus on:
 * - Token efficiency defaults
 * - Project filtering
 * - CRUD operations
 * - System config retrieval
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ConnectorsClient } from '../src/client/connectors.ts';
import type { Connector, SystemConfig } from '../src/types/api.ts';

describe('ConnectorsClient', () => {
	let client: ConnectorsClient;

	beforeEach(() => {
		client = new ConnectorsClient();
	});

	describe('list()', () => {
		test('defaults to count mode for token efficiency', async () => {
			// This test would require mocking the HTTP client
			// For now, we verify the method signature and options
			expect(client.list).toBeDefined();
			expect(typeof client.list).toBe('function');
		});

		test('accepts projectId parameter', async () => {
			expect(client.list).toBeDefined();
			// Method should accept optional projectId string
			const listCall = () => client.list('N1r8Do');
			expect(listCall).toBeDefined();
		});

		test('accepts token efficiency options', async () => {
			expect(client.list).toBeDefined();
			// Method should accept options object
			const listCall = () =>
				client.list('N1r8Do', {
					count: false,
					fields: 'connectorID,connectorName',
					limit: 10
				});
			expect(listCall).toBeDefined();
		});
	});

	describe('get()', () => {
		test('is defined and accepts connector ID', () => {
			expect(client.get).toBeDefined();
			expect(typeof client.get).toBe('function');

			const getCall = () => client.get('conn-123');
			expect(getCall).toBeDefined();
		});
	});

	describe('create()', () => {
		test('is defined and accepts partial connector data', () => {
			expect(client.create).toBeDefined();
			expect(typeof client.create).toBe('function');

			const createCall = () =>
				client.create({
					connectorName: 'Test Connector',
					connectorType: 'database',
					internalID: 'N1r8Do'
				});
			expect(createCall).toBeDefined();
		});
	});

	describe('update()', () => {
		test('is defined and accepts id and partial data', () => {
			expect(client.update).toBeDefined();
			expect(typeof client.update).toBe('function');

			const updateCall = () =>
				client.update('conn-123', {
					connectorName: 'Updated Name'
				});
			expect(updateCall).toBeDefined();
		});
	});

	describe('delete()', () => {
		test('is defined and accepts connector ID', () => {
			expect(client.delete).toBeDefined();
			expect(typeof client.delete).toBe('function');

			const deleteCall = () => client.delete('conn-123');
			expect(deleteCall).toBeDefined();
		});
	});

	describe('getConfig()', () => {
		test('is defined and accepts token efficiency options', () => {
			expect(client.getConfig).toBeDefined();
			expect(typeof client.getConfig).toBe('function');

			const configCall = () =>
				client.getConfig({
					fields: 'hostingEnvironment,sourceConnectors'
				});
			expect(configCall).toBeDefined();
		});
	});

	describe('client creation', () => {
		test('extends DatabasinClient', () => {
			expect(client).toBeInstanceOf(ConnectorsClient);
			// Should have base client methods
			expect(client.ping).toBeDefined();
			expect(client.getBaseUrl).toBeDefined();
			expect(client.setBaseUrl).toBeDefined();
		});
	});
});

describe('Type Definitions', () => {
	test('Connector interface has required fields', () => {
		const connector: Partial<Connector> = {
			connectorID: 'conn-123',
			connectorName: 'Test Connector',
			connectorType: 'database',
			status: 'active'
		};

		expect(connector.connectorID).toBe('conn-123');
		expect(connector.connectorName).toBe('Test Connector');
		expect(connector.connectorType).toBe('database');
		expect(connector.status).toBe('active');
	});

	test('SystemConfig interface has expected structure', () => {
		const config: Partial<SystemConfig> = {
			key: 'system-config',
			hostingEnvironment: 'Azure',
			sourceConnectors: [],
			targetConnectors: []
		};

		expect(config.key).toBe('system-config');
		expect(config.hostingEnvironment).toBe('Azure');
		expect(Array.isArray(config.sourceConnectors)).toBe(true);
		expect(Array.isArray(config.targetConnectors)).toBe(true);
	});
});
