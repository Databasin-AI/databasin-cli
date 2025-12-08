/**
 * Tests for connectors inspect command
 *
 * Validates comprehensive connector inspection functionality including:
 * - ID and name-based lookup
 * - Connection testing
 * - Configuration sanitization
 * - Database structure discovery
 * - Pipeline usage analysis
 * - Quick action suggestions
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { inspectCommand } from '../../src/commands/connectors-inspect';
import type { Connector, Pipeline, Project } from '../../src/types/api';

describe('connectors inspect command', () => {
	// Mock clients
	const mockConnectorsClient = {
		getById: mock(async (id: string) => ({
			connectorID: id,
			connectorName: 'Test Postgres',
			connectorType: 'postgres',
			connectorSubType: 'PostgreSQL',
			internalID: 'N1r8Do',
			createdAt: '2024-10-15T00:00:00Z',
			configuration: {
				host: 'db.example.com',
				port: 5432,
				database: 'production',
				username: 'app_user',
				password: 'secret123',
				ssl: true
			}
		} as Connector)),
		list: mock(async () => [] as Connector[]),
		test: mock(async () => ({ success: true, message: 'Connection successful' }))
	};

	const mockPipelinesClient = {
		list: mock(async () => [] as Pipeline[])
	};

	const mockProjectsClient = {
		list: mock(async () => [
			{ id: 1, internalId: 'N1r8Do', name: 'Test Project' }
		] as Project[])
	};

	const mockSqlClient = {
		getCatalogs: mock(async () => ({
			connectorID: 5459,
			connectorType: 'RDBMS',
			connectorDatabase: 'postgres',
			connectorName: 'TestDB',
			objects: ['postgres', 'template0'],
			connectorTechnology: 'postgres'
		})),
		getSchemas: mock(async () => ({
			connectorID: 5459,
			connectorType: 'RDBMS',
			connectorDatabase: 'postgres',
			connectorName: 'TestDB',
			objects: ['public', 'config'],
			connectorTechnology: 'postgres'
		})),
		listTables: mock(async () => [
			{ name: 'users', type: 'TABLE' },
			{ name: 'orders', type: 'TABLE' }
		])
	};

	const mockCommand = {
		optsWithGlobals: () => ({
			_config: {},
			_clients: {
				connectors: mockConnectorsClient,
				pipelines: mockPipelinesClient,
				projects: mockProjectsClient,
				sql: mockSqlClient
			},
			debug: false
		})
	};

	beforeEach(() => {
		// Reset all mocks
		mockConnectorsClient.getById.mockClear();
		mockConnectorsClient.list.mockClear();
		mockConnectorsClient.test.mockClear();
		mockPipelinesClient.list.mockClear();
		mockProjectsClient.list.mockClear();
		mockSqlClient.getCatalogs.mockClear();
		mockSqlClient.getSchemas.mockClear();
		mockSqlClient.listTables.mockClear();
	});

	test('should accept connector ID', async () => {
		// Mock console.log to capture output
		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('5459', {}, mockCommand as any);

			// Verify connector was fetched by ID
			expect(mockConnectorsClient.getById).toHaveBeenCalledWith('5459');

			// Verify connection was tested
			expect(mockConnectorsClient.test).toHaveBeenCalledWith('5459');

			// Verify output contains key sections
			const output = consoleLogs.join('\n');
			expect(output).toContain('Test Postgres');
			expect(output).toContain('5459');
		} finally {
			console.log = originalLog;
		}
	});

	test('should accept connector name', async () => {
		// Mock list to return matching connectors
		mockConnectorsClient.list.mockResolvedValueOnce([
			{
				connectorID: '5459',
				connectorName: 'Test Postgres',
				connectorType: 'postgres'
			}
		] as Connector[]);

		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('postgres', {}, mockCommand as any);

			// Verify list was called to search by name
			expect(mockConnectorsClient.list).toHaveBeenCalled();

			// Verify connection was tested
			expect(mockConnectorsClient.test).toHaveBeenCalled();
		} finally {
			console.log = originalLog;
		}
	});

	test('should test connection and show status', async () => {
		// Mock successful connection test
		mockConnectorsClient.test.mockResolvedValueOnce({
			success: true,
			message: 'Connection successful'
		});

		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('5459', {}, mockCommand as any);

			const output = consoleLogs.join('\n');
			expect(output).toContain('Status: Active');
		} finally {
			console.log = originalLog;
		}
	});

	test('should handle connection failures gracefully', async () => {
		// Mock failed connection test
		mockConnectorsClient.test.mockResolvedValueOnce({
			success: false,
			message: 'Invalid credentials'
		});

		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('5459', {}, mockCommand as any);

			const output = consoleLogs.join('\n');
			expect(output).toContain('Status: Failed');
		} finally {
			console.log = originalLog;
		}
	});

	test('should sanitize sensitive configuration fields', async () => {
		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('5459', {}, mockCommand as any);

			const output = consoleLogs.join('\n');

			// Should show non-sensitive fields
			expect(output).toContain('Host: db.example.com');
			expect(output).toContain('Port: 5432');
			expect(output).toContain('Database: production');

			// Should NOT show password
			expect(output).not.toContain('secret123');
		} finally {
			console.log = originalLog;
		}
	});

	test('should discover database structure for SQL connectors', async () => {
		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('5459', {}, mockCommand as any);

			// Verify discovery methods were called
			expect(mockSqlClient.getCatalogs).toHaveBeenCalledWith('5459');

			const output = consoleLogs.join('\n');
			expect(output).toContain('Database Structure');
		} finally {
			console.log = originalLog;
		}
	});

	test('should find and display pipeline usage', async () => {
		// Mock pipelines using this connector
		mockPipelinesClient.list.mockResolvedValueOnce([
			{
				pipelineID: 8901,
				pipelineName: 'Daily Sync',
				sourceConnectorId: '5459',
				targetConnectorId: '1234'
			},
			{
				pipelineID: 8902,
				pipelineName: 'Weekly Export',
				sourceConnectorId: '5459',
				targetConnectorId: '5678'
			}
		] as Pipeline[]);

		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('5459', {}, mockCommand as any);

			const output = consoleLogs.join('\n');
			expect(output).toContain('Pipeline Usage');
			expect(output).toContain('Used in 2 pipeline(s)');
			expect(output).toContain('Daily Sync');
			expect(output).toContain('Weekly Export');
		} finally {
			console.log = originalLog;
		}
	});

	test('should show quick action commands', async () => {
		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('5459', {}, mockCommand as any);

			const output = consoleLogs.join('\n');
			expect(output).toContain('Quick Actions');
			expect(output).toContain('databasin sql exec 5459');
			expect(output).toContain('databasin pipelines create');
			expect(output).toContain('databasin connectors test');
		} finally {
			console.log = originalLog;
		}
	});

	test('should handle non-SQL connectors correctly', async () => {
		// Mock non-SQL connector
		mockConnectorsClient.getById.mockResolvedValueOnce({
			connectorID: '9999',
			connectorName: 'Salesforce API',
			connectorType: 'app',
			connectorSubType: 'Salesforce',
			configuration: {
				instanceUrl: 'https://mycompany.salesforce.com',
				apiVersion: '58.0'
			}
		} as Connector);

		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('9999', {}, mockCommand as any);

			// Should NOT try to discover database structure
			expect(mockSqlClient.getCatalogs).not.toHaveBeenCalled();

			const output = consoleLogs.join('\n');
			// Should still show quick actions, but not SQL-specific ones
			expect(output).toContain('Quick Actions');
			expect(output).toContain('databasin pipelines create');
		} finally {
			console.log = originalLog;
		}
	});

	test('should handle multiple name matches with error', async () => {
		// Mock list to return multiple matching connectors
		mockConnectorsClient.list.mockResolvedValueOnce([
			{
				connectorID: '5459',
				connectorName: 'Test Postgres 1',
				connectorType: 'postgres'
			},
			{
				connectorID: '5460',
				connectorName: 'Test Postgres 2',
				connectorType: 'postgres'
			}
		] as Connector[]);

		const consoleLogs: string[] = [];
		const originalLog = console.log;
		const originalExit = process.exit;
		let exitCalled = false;

		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		// Mock process.exit to prevent actual exit
		process.exit = ((_code?: number) => {
			exitCalled = true;
			throw new Error('Process exit called');
		}) as any;

		try {
			// Should throw an error for multiple matches
			await expect(inspectCommand('postgres', {}, mockCommand as any)).rejects.toThrow();

			const output = consoleLogs.join('\n');
			expect(output).toContain('Multiple matches found');
			expect(output).toContain('Test Postgres 1');
			expect(output).toContain('Test Postgres 2');
		} finally {
			console.log = originalLog;
			process.exit = originalExit;
		}
	});

	test('should handle connector not found error', async () => {
		// Mock empty list (no matches)
		mockConnectorsClient.list.mockResolvedValueOnce([]);

		// Mock process.exit to prevent test termination
		const originalExit = process.exit;
		let exitCode: number | undefined;
		process.exit = ((code?: number) => {
			exitCode = code;
		}) as any;

		const consoleLogs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			consoleLogs.push(args.join(' '));
		};

		try {
			await inspectCommand('nonexistent', {}, mockCommand as any);

			expect(exitCode).toBe(1);
		} finally {
			console.log = originalLog;
			process.exit = originalExit;
		}
	});
});
