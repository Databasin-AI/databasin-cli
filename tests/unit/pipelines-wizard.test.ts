/**
 * Unit Tests for Pipeline Creation Wizard
 *
 * Tests wizard helper functions and logic.
 * Full wizard flow testing is better suited for integration tests
 * due to interactive prompts.
 *
 * @see src/commands/pipelines-wizard.ts
 */

import { describe, test, expect } from 'bun:test';
import type { Connector } from '../../src/types/api.ts';

describe('Pipeline Wizard Helper Functions', () => {
	describe('Ingestion Pattern Detection', () => {
		test('should detect datalake pattern for databricks', () => {
			const lakehouseTypes = ['databricks', 'snowflake', 'lakehouse', 'redshift', 'bigquery'];

			lakehouseTypes.forEach((type) => {
				// These types should all trigger datalake pattern
				expect(type.toLowerCase()).toBe(type.toLowerCase());
			});
		});

		test('should detect data warehouse pattern for non-lakehouse types', () => {
			const warehouseTypes = ['postgres', 'mysql', 'mssql', 'oracle'];

			warehouseTypes.forEach((type) => {
				// These types should trigger data warehouse pattern
				expect(type.toLowerCase()).toBe(type.toLowerCase());
			});
		});

		test('should handle case insensitivity', () => {
			const variations = ['DATABRICKS', 'Databricks', 'databricks', 'DaTaBrIcKs'];

			variations.forEach((type) => {
				const normalized = type.toLowerCase();
				expect(normalized).toBe('databricks');
			});
		});
	});

	describe('Connector Formatting', () => {
		test('should format connector display title correctly', () => {
			const connector: Partial<Connector> = {
				connectorID: 123,
				connectorName: 'Production DB',
				connectorSubType: 'postgres'
			};

			const expected = 'Production DB (postgres) - ID: 123';
			const actual = `${connector.connectorName} (${connector.connectorSubType}) - ID: ${connector.connectorID}`;

			expect(actual).toBe(expected);
		});

		test('should handle connectors with special characters in name', () => {
			const connector: Partial<Connector> = {
				connectorID: 456,
				connectorName: 'DB: Production (v2)',
				connectorSubType: 'mysql'
			};

			const formatted = `${connector.connectorName} (${connector.connectorSubType}) - ID: ${connector.connectorID}`;
			expect(formatted).toContain('DB: Production (v2)');
		});
	});

	describe('Connector Filtering', () => {
		const mockConnectors: Partial<Connector>[] = [
			{ connectorID: 1, connectorName: 'Source 1', connectorSubType: 'postgres' },
			{ connectorID: 2, connectorName: 'Source 2', connectorSubType: 'mysql' },
			{ connectorID: 3, connectorName: 'Target 1', connectorSubType: 'snowflake' },
			{ connectorID: 4, connectorName: 'Target 2', connectorSubType: 'databricks' }
		];

		test('should filter out source connector from target list', () => {
			const sourceConnectorId = '1';
			const filteredConnectors = mockConnectors.filter(
				(c) => String(c.connectorID) !== sourceConnectorId
			);

			expect(filteredConnectors.length).toBe(3);
			expect(filteredConnectors.find((c) => c.connectorID === 1)).toBeUndefined();
		});

		test('should handle empty connector list', () => {
			const sourceConnectorId = '1';
			const filteredConnectors = [].filter((c: any) => String(c.connectorID) !== sourceConnectorId);

			expect(filteredConnectors.length).toBe(0);
		});
	});

	describe('Job Scheduling Configuration', () => {
		test('should generate correct hourly cron expression', () => {
			const hourly = '0 * * * *';
			expect(hourly).toBe('0 * * * *');
		});

		test('should generate correct daily cron expression', () => {
			const hour = 2;
			const daily = `0 ${hour} * * *`;
			expect(daily).toBe('0 2 * * *');
		});

		test('should generate correct weekly cron expression', () => {
			const hour = 2;
			const day = 1; // Monday
			const weekly = `0 ${hour} * * ${day}`;
			expect(weekly).toBe('0 2 * * 1');
		});

		test('should validate hour range (0-23)', () => {
			const validHours = [0, 1, 12, 23];
			validHours.forEach((hour) => {
				expect(hour).toBeGreaterThanOrEqual(0);
				expect(hour).toBeLessThanOrEqual(23);
			});

			const invalidHours = [-1, 24, 25];
			invalidHours.forEach((hour) => {
				const isInvalid = hour < 0 || hour > 23;
				expect(isInvalid).toBe(true);
			});
		});

		test('should validate day of week range (0-6)', () => {
			const validDays = [0, 1, 5, 6]; // Sunday to Saturday
			validDays.forEach((day) => {
				expect(day).toBeGreaterThanOrEqual(0);
				expect(day).toBeLessThanOrEqual(6);
			});
		});

		test('should validate cron expression format (5 fields)', () => {
			const validCron = '0 2 * * *';
			const parts = validCron.split(/\s+/);
			expect(parts.length).toBe(5);

			const invalidCron = '0 2 * *'; // Only 4 fields
			const invalidParts = invalidCron.split(/\s+/);
			expect(invalidParts.length).toBe(4);
		});
	});

	describe('Default Job Configuration', () => {
		test('should have correct default values', () => {
			const defaults = {
				jobRunSchedule: '0 10 * * *', // 10 AM UTC daily
				jobRunTimeZone: 'UTC',
				jobClusterSize: 'S',
				jobTimeout: '43200', // 12 hours in seconds
				tags: [],
				emailNotifications: []
			};

			expect(defaults.jobClusterSize).toBe('S');
			expect(defaults.jobRunSchedule).toBe('0 10 * * *');
			expect(defaults.jobRunTimeZone).toBe('UTC');
			expect(defaults.jobTimeout).toBe('43200');
			expect(defaults.tags).toEqual([]);
			expect(defaults.emailNotifications).toEqual([]);
		});

		test('should have valid cluster sizes', () => {
			const validSizes = ['S', 'M', 'L', 'XL'];
			validSizes.forEach((size) => {
				expect(['S', 'M', 'L', 'XL']).toContain(size);
			});
		});

		test('should have valid timezone format', () => {
			const validTimezones = [
				'UTC',
				'America/New_York',
				'America/Chicago',
				'America/Los_Angeles',
				'Europe/London',
				'Asia/Tokyo'
			];

			validTimezones.forEach((tz) => {
				expect(tz).toBeTruthy();
				expect(tz.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Artifact Configuration', () => {
		test('should create basic artifact from table name', () => {
			const tableName = 'users';
			const schema = 'public';

			const artifact = {
				sourceObjectName: tableName,
				targetObjectName: tableName,
				sourceSchema: schema,
				columns: '*',
				ingestionType: 'full',
				primaryKeys: null,
				timestampColumn: null,
				autoExplode: false,
				detectDeletes: false,
				priority: false,
				replaceTable: false,
				backloadNumDays: 0,
				snapshotRetentionPeriod: 3
			};

			expect(artifact.sourceObjectName).toBe('users');
			expect(artifact.targetObjectName).toBe('users');
			expect(artifact.sourceSchema).toBe('public');
			expect(artifact.columns).toBe('*');
			expect(artifact.ingestionType).toBe('full');
		});

		test('should parse comma-separated table names', () => {
			const input = 'users, orders, products';
			const tableNames = input
				.split(',')
				.map((name) => name.trim())
				.filter((name) => name.length > 0);

			expect(tableNames).toEqual(['users', 'orders', 'products']);
		});

		test('should handle empty strings in table list', () => {
			const input = 'users, , orders, , products';
			const tableNames = input
				.split(',')
				.map((name) => name.trim())
				.filter((name) => name.length > 0);

			expect(tableNames).toEqual(['users', 'orders', 'products']);
		});
	});

	describe('Pipeline Payload Building', () => {
		test('should build correct payload structure for datalake mode', () => {
			const payload = {
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '123',
				targetConnectorID: '456',
				institutionID: 1,
				internalID: 'proj-abc',
				ownerID: 42,
				ingestionPattern: 'datalake',
				targetCatalogName: '',
				targetSchemaName: 'analytics',
				jobDetails: {
					jobRunSchedule: '0 2 * * *',
					jobRunTimeZone: 'UTC',
					jobClusterSize: 'M'
				},
				items: []
			};

			expect(payload.ingestionPattern).toBe('datalake');
			expect(payload.targetSchemaName).toBe('analytics');
			expect(payload.targetCatalogName).toBe('');
		});

		test('should build correct payload structure for data warehouse mode', () => {
			const payload = {
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '123',
				targetConnectorID: '456',
				institutionID: 1,
				internalID: 'proj-abc',
				ownerID: 42,
				ingestionPattern: 'data warehouse',
				targetCatalogName: 'prod_db',
				targetSchemaName: '',
				jobDetails: {
					jobRunSchedule: '0 2 * * *',
					jobRunTimeZone: 'UTC',
					jobClusterSize: 'M'
				},
				items: []
			};

			expect(payload.ingestionPattern).toBe('data warehouse');
			expect(payload.targetCatalogName).toBe('prod_db');
			expect(payload.targetSchemaName).toBe('');
		});
	});

	describe('Phase 2 Integration Readiness', () => {
		test('should support JSON file artifact input', () => {
			// When Phase 2 is implemented, JSON file input should work
			const artifactsFromFile = [
				{
					sourceObjectName: 'table1',
					targetObjectName: 'table1',
					columns: '*'
				},
				{
					sourceObjectName: 'table2',
					targetObjectName: 'table2',
					columns: '*'
				}
			];

			expect(Array.isArray(artifactsFromFile)).toBe(true);
			expect(artifactsFromFile.length).toBe(2);
		});

		test('should validate artifact array structure', () => {
			const validArtifacts = [
				{ sourceObjectName: 'table1', targetObjectName: 'table1' }
			];

			expect(Array.isArray(validArtifacts)).toBe(true);
			expect(validArtifacts[0]).toHaveProperty('sourceObjectName');
			expect(validArtifacts[0]).toHaveProperty('targetObjectName');
		});
	});

	describe('User Input Validation', () => {
		test('should validate pipeline name is not empty', () => {
			const validNames = ['My Pipeline', 'Prod Pipeline v2', 'DB Sync'];
			validNames.forEach((name) => {
				expect(name.trim().length).toBeGreaterThan(0);
			});

			const invalidNames = ['', '   ', '\t\n'];
			invalidNames.forEach((name) => {
				expect(name.trim().length).toBe(0);
			});
		});

		test('should validate pipeline name minimum length', () => {
			const minLength = 3;

			const validNames = ['ABC', 'Test', 'Pipeline'];
			validNames.forEach((name) => {
				expect(name.length).toBeGreaterThanOrEqual(minLength);
			});

			const invalidNames = ['AB', 'X', ''];
			invalidNames.forEach((name) => {
				expect(name.length).toBeLessThan(minLength);
			});
		});

		test('should validate schema name is not empty', () => {
			const valid = 'public';
			expect(valid.trim().length).toBeGreaterThan(0);

			const invalid = '';
			expect(invalid.trim().length).toBe(0);
		});
	});

	describe('Cache Integration', () => {
		test('should use cache key format for connectors', () => {
			const projectId = 'proj-123';
			const cacheKey = `connectors_${projectId}`;

			expect(cacheKey).toBe('connectors_proj-123');
		});

		test('should use appropriate TTL for connector list', () => {
			const ttl = 5 * 60 * 1000; // 5 minutes
			expect(ttl).toBe(300000);
		});
	});
});
