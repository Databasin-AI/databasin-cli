/**
 * Unit Tests for Pipeline Payload Enrichment
 *
 * Tests the payload enrichment engine that transforms minimal user input
 * into complete pipeline payloads with smart defaults and type coercion.
 *
 * These tests verify that the CLI matches frontend wizard behavior exactly.
 *
 * @see src/client/pipelines.ts
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { PipelinesClient } from '../../src/client/pipelines.ts';
import type { Pipeline, Connector } from '../../src/types/api.ts';
import { ValidationError, ApiError } from '../../src/utils/errors.ts';

describe('PipelinesClient - Payload Enrichment', () => {
	let client: PipelinesClient;
	let mockConnectors: Record<string, Connector>;

	beforeEach(() => {
		client = new PipelinesClient();

		// Mock connectors for testing
		mockConnectors = {
			'100': {
				connectorID: 100,
				connectorName: 'Test MySQL',
				connectorSubType: 'MySQL',
				connectorType: 1,
				status: 'active',
				institutionID: 1,
				isActive: '1',
				isHealthy: '1',
				connectorDatabase: 'testdb'
			},
			'200': {
				connectorID: 200,
				connectorName: 'Test Snowflake',
				connectorSubType: 'Snowflake',
				connectorType: 2,
				status: 'active',
				institutionID: 1,
				isActive: '1',
				isHealthy: '1',
				connectorDatabase: 'testdb'
			},
			'300': {
				connectorID: 300,
				connectorName: 'Test Databricks',
				connectorSubType: 'Databricks',
				connectorType: 2,
				status: 'active',
				institutionID: 1,
				isActive: '1',
				isHealthy: '1',
				connectorDatabase: 'testdb'
			},
			'400': {
				connectorID: 400,
				connectorName: 'Test CSV',
				connectorSubType: 'CSV',
				connectorType: 3,
				status: 'active',
				institutionID: 1,
				isActive: '1',
				isHealthy: '1',
				connectorDatabase: ''
			},
			'500': {
				connectorID: 500,
				connectorName: 'Inactive Connector',
				connectorSubType: 'PostgreSQL',
				connectorType: 1,
				status: 'inactive',
				institutionID: 1,
				isActive: '0',
				isHealthy: '0',
				connectorDatabase: 'testdb'
			}
		};

		// Mock the get method to return connectors
		client['get'] = mock(async (path: string) => {
			if (path.startsWith('/api/connector/')) {
				const id = path.split('/').pop()!;
				const connector = mockConnectors[id];
				if (!connector) {
					throw new ApiError('Connector not found', 404, path);
				}
				return connector;
			}
			if (path === '/api/my/account') {
				return { email: 'test@example.com' };
			}
			throw new Error(`Unexpected GET: ${path}`);
		}) as any;

		// Mock the post method
		client['post'] = mock(async (path: string, data: any) => {
			if (path === '/api/pipeline') {
				return {
					...data,
					pipelineID: 999,
					created: new Date().toISOString()
				} as Pipeline;
			}
			throw new Error(`Unexpected POST: ${path}`);
		}) as any;
	});

	describe('create() - validation', () => {
		test('should throw ValidationError if pipelineName is missing', async () => {
			expect(async () => {
				await client.create({
					sourceConnectorID: '100',
					targetConnectorID: '200',
					institutionID: 1,
					internalID: 'test',
					ownerID: 1
				} as any);
			}).toThrow(ValidationError);
		});

		test('should throw ValidationError if pipelineName is empty', async () => {
			expect(async () => {
				await client.create({
					pipelineName: '   ',
					sourceConnectorID: '100',
					targetConnectorID: '200',
					institutionID: 1,
					internalID: 'test',
					ownerID: 1
				});
			}).toThrow(ValidationError);
		});

		test('should throw ValidationError if sourceConnectorID is missing', async () => {
			expect(async () => {
				await client.create({
					pipelineName: 'Test',
					targetConnectorID: '200',
					institutionID: 1,
					internalID: 'test',
					ownerID: 1
				} as any);
			}).toThrow(ValidationError);
		});

		test('should throw ValidationError if targetConnectorID is missing', async () => {
			expect(async () => {
				await client.create({
					pipelineName: 'Test',
					sourceConnectorID: '100',
					institutionID: 1,
					internalID: 'test',
					ownerID: 1
				} as any);
			}).toThrow(ValidationError);
		});

		test('should throw ValidationError if institutionID is missing', async () => {
			expect(async () => {
				await client.create({
					pipelineName: 'Test',
					sourceConnectorID: '100',
					targetConnectorID: '200',
					internalID: 'test',
					ownerID: 1
				} as any);
			}).toThrow(ValidationError);
		});

		test('should throw ValidationError if internalID is missing', async () => {
			expect(async () => {
				await client.create({
					pipelineName: 'Test',
					sourceConnectorID: '100',
					targetConnectorID: '200',
					institutionID: 1,
					ownerID: 1
				} as any);
			}).toThrow(ValidationError);
		});

		test('should throw ValidationError if ownerID is missing', async () => {
			expect(async () => {
				await client.create({
					pipelineName: 'Test',
					sourceConnectorID: '100',
					targetConnectorID: '200',
					institutionID: 1,
					internalID: 'test'
				} as any);
			}).toThrow(ValidationError);
		});

		test('should throw ValidationError for inactive source connector', async () => {
			expect(async () => {
				await client.create({
					pipelineName: 'Test',
					sourceConnectorID: '500',
					targetConnectorID: '200',
					institutionID: 1,
					internalID: 'test',
					ownerID: 1,
					targetCatalogName: 'analytics'
				});
			}).toThrow(ValidationError);
		});

		test('should throw ValidationError for inactive target connector', async () => {
			expect(async () => {
				await client.create({
					pipelineName: 'Test',
					sourceConnectorID: '100',
					targetConnectorID: '500',
					institutionID: 1,
					internalID: 'test',
					ownerID: 1,
					targetCatalogName: 'analytics'
				});
			}).toThrow(ValidationError);
		});

		test('should throw ValidationError for non-existent connector', async () => {
			try {
				await client.create({
					pipelineName: 'Test',
					sourceConnectorID: '999',
					targetConnectorID: '200',
					institutionID: 1,
					internalID: 'test',
					ownerID: 1,
					targetCatalogName: 'analytics'
				});
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(ValidationError);
			}
		});
	});

	describe('create() - data warehouse mode', () => {
		test('should create pipeline with data warehouse defaults', async () => {
			const postMock = client['post'] as any;

			// Note: Connector 200 is Snowflake, which auto-triggers datalake mode
			// So we need to explicitly set ingestionPattern to override
			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetCatalogName: 'analytics',
				ingestionPattern: 'data warehouse' // Explicitly override auto-detection
			});

			// Get the payload that was posted
			const calls = postMock.mock.calls;
			expect(calls.length).toBe(1);

			const [path, payload] = calls[0];
			expect(path).toBe('/api/pipeline');
			expect(payload.ingestionPattern).toBe('data warehouse');
			expect(payload.sourceNamingConvention).toBe(true);
			expect(payload.createCatalogs).toBe(false);
		});

		test('should throw ValidationError if targetCatalogName is missing in data warehouse mode', async () => {
			expect(async () => {
				await client.create({
					pipelineName: 'Test',
					sourceConnectorID: '100',
					targetConnectorID: '200',
					institutionID: 1,
					internalID: 'test',
					ownerID: 1
					// Missing targetCatalogName
				});
			}).toThrow(ValidationError);
		});
	});

	describe('create() - datalake mode auto-detection', () => {
		test('should auto-detect datalake mode for Snowflake target', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200', // Snowflake
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw'
			});

			const [_, payload] = postMock.mock.calls[0];
			expect(payload.ingestionPattern).toBe('datalake');
			expect(payload.sourceNamingConvention).toBe(false);
			expect(payload.createCatalogs).toBe(true);
		});

		test('should auto-detect datalake mode for Databricks target', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '300', // Databricks
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'bronze'
			});

			const [_, payload] = postMock.mock.calls[0];
			expect(payload.ingestionPattern).toBe('datalake');
			expect(payload.sourceNamingConvention).toBe(false);
			expect(payload.createCatalogs).toBe(true);
		});

		test('should throw ValidationError if targetSchemaName is missing in datalake mode', async () => {
			expect(async () => {
				await client.create({
					pipelineName: 'Test',
					sourceConnectorID: '100',
					targetConnectorID: '200', // Snowflake (triggers datalake)
					institutionID: 1,
					internalID: 'test',
					ownerID: 1
					// Missing targetSchemaName
				});
			}).toThrow(ValidationError);
		});
	});

	describe('create() - job details enrichment', () => {
		test('should add default job details', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw'
			});

			const [_, payload] = postMock.mock.calls[0];
			expect(payload.jobDetails).toBeDefined();
			expect(payload.jobDetails.tags).toEqual([]);
			expect(payload.jobDetails.jobClusterSize).toBe('S');
			expect(payload.jobDetails.emailNotifications).toContain('test@example.com');
			expect(payload.jobDetails.jobRunSchedule).toBe('0 10 * * *');
			expect(payload.jobDetails.jobRunTimeZone).toBe('UTC');
			expect(payload.jobDetails.jobTimeout).toBe('43200'); // MUST be string
			expect(typeof payload.jobDetails.jobTimeout).toBe('string');
		});

		test('should merge user-provided job details with defaults', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				jobDetails: {
					tags: ['production'],
					jobClusterSize: 'L'
				}
			});

			const [_, payload] = postMock.mock.calls[0];
			expect(payload.jobDetails.tags).toEqual(['production']);
			expect(payload.jobDetails.jobClusterSize).toBe('L');
			expect(payload.jobDetails.jobRunSchedule).toBe('0 10 * * *'); // Default
		});

		test('should ensure jobTimeout is always a string', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				jobDetails: {
					jobTimeout: 86400 as any // User provides number
				}
			});

			const [_, payload] = postMock.mock.calls[0];
			expect(payload.jobDetails.jobTimeout).toBe('86400');
			expect(typeof payload.jobDetails.jobTimeout).toBe('string');
		});
	});

	describe('create() - artifact enrichment', () => {
		test('should enrich artifacts with required fields', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				items: [
					{
						sourceDatabaseName: 'mydb',
						sourceTableName: 'users',
						targetDatabaseName: 'analytics',
						targetSchemaName: 'public'
					}
				]
			});

			const [_, payload] = postMock.mock.calls[0];
			expect(payload.items.length).toBe(1);

			const artifact = payload.items[0];
			expect(artifact.sourceConnectionID).toBe(100);
			expect(artifact.targetConnectionID).toBe(200);
			expect(artifact.artifactType).toBe(1); // RDBMS for MySQL
			expect(artifact.autoExplode).toBe(false);
			expect(artifact.detectDeletes).toBe(false);
			expect(artifact.priority).toBe(false);
			expect(artifact.replaceTable).toBe(false);
			expect(artifact.backloadNumDays).toBe(0);
			expect(artifact.snapshotRetentionPeriod).toBe(3);
		});

		test('should coerce boolean artifact fields from strings', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				items: [
					{
						sourceDatabaseName: 'mydb',
						sourceTableName: 'users',
						autoExplode: 'true' as any,
						detectDeletes: '1' as any,
						priority: 'on' as any,
						replaceTable: 't' as any
					}
				]
			});

			const artifact = postMock.mock.calls[0][1].items[0];
			expect(artifact.autoExplode).toBe(true);
			expect(artifact.detectDeletes).toBe(true);
			expect(artifact.priority).toBe(true);
			expect(artifact.replaceTable).toBe(true);
		});

		test('should coerce numeric artifact fields from strings', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				items: [
					{
						sourceDatabaseName: 'mydb',
						sourceTableName: 'users',
						backloadNumDays: '30' as any,
						snapshotRetentionPeriod: '7' as any
					}
				]
			});

			const artifact = postMock.mock.calls[0][1].items[0];
			expect(artifact.backloadNumDays).toBe(30);
			expect(artifact.snapshotRetentionPeriod).toBe(7);
		});

		test('should handle empty items array', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				items: []
			});

			const [_, payload] = postMock.mock.calls[0];
			expect(payload.items).toEqual([]);
		});
	});

	describe('create() - CSV/file artifact enrichment', () => {
		test('should add CSV-specific defaults for CSV artifacts', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'CSV Pipeline',
				sourceConnectorID: '400', // CSV connector
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				items: [
					{
						sourceFileName: 'data.csv',
						sourceFileFormat: 'csv',
						targetDatabaseName: 'analytics',
						targetSchemaName: 'staging'
					}
				]
			});

			const artifact = postMock.mock.calls[0][1].items[0];
			expect(artifact.containsHeader).toBe(true); // Default for CSV
			expect(artifact.columnHeaderLineNumber).toBe(1); // Default when containsHeader=true
			expect(artifact.sourceFileDelimiter).toBe(','); // Default for CSV
		});

		test('should respect user-provided CSV settings', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'CSV Pipeline',
				sourceConnectorID: '400',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				items: [
					{
						sourceFileName: 'data.csv',
						sourceFileFormat: 'csv',
						containsHeader: false,
						sourceFileDelimiter: '|'
					}
				]
			});

			const artifact = postMock.mock.calls[0][1].items[0];
			expect(artifact.containsHeader).toBe(false);
			expect(artifact.columnHeaderLineNumber).toBe(0); // 0 when no header
			expect(artifact.sourceFileDelimiter).toBe('|');
		});

		test('should handle txt files like CSV', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'TXT Pipeline',
				sourceConnectorID: '400',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				items: [
					{
						sourceFileName: 'data.txt',
						sourceFileFormat: 'txt'
					}
				]
			});

			const artifact = postMock.mock.calls[0][1].items[0];
			expect(artifact.containsHeader).toBe(true);
			expect(artifact.sourceFileDelimiter).toBe(',');
		});
	});

	describe('create() - connector caching', () => {
		test('should cache connectors to avoid duplicate API calls', async () => {
			const getMock = client['get'] as any;

			await client.create({
				pipelineName: 'Test Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw'
			});

			// Count connector API calls
			const connectorCalls = getMock.mock.calls.filter((call: any[]) =>
				call[0].startsWith('/api/connector/')
			);

			// Should fetch each connector exactly once despite needing:
			// - validateConnector (both source and target)
			// - getConnectorTechnology (source)
			// - getArtifactType (source, via enrichArtifacts)
			expect(connectorCalls.length).toBeLessThanOrEqual(2); // Max 2: source + target
		});

		test('should clear cache after operation', async () => {
			// Create new client with fresh mock for this test
			const testClient = new PipelinesClient();
			let callCount = 0;

			testClient['get'] = mock(async (path: string) => {
				callCount++;
				if (path.startsWith('/api/connector/')) {
					const id = path.split('/').pop()!;
					return mockConnectors[id];
				}
				if (path === '/api/my/account') {
					return { email: 'test@example.com' };
				}
				throw new Error(`Unexpected GET: ${path}`);
			}) as any;

			testClient['post'] = mock(async (path: string, data: any) => {
				if (path === '/api/pipeline') {
					return {
						...data,
						pipelineID: 999,
						created: new Date().toISOString()
					} as Pipeline;
				}
				throw new Error(`Unexpected POST: ${path}`);
			}) as any;

			await testClient.create({
				pipelineName: 'Test Pipeline 1',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw'
			});

			const firstCallCount = callCount;

			await testClient.create({
				pipelineName: 'Test Pipeline 2',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw'
			});

			// Should have made more calls (cache cleared between operations)
			expect(callCount).toBeGreaterThan(firstCallCount);
		});
	});

	describe('create() - complete payload structure', () => {
		test('should build complete payload matching frontend', async () => {
			const postMock = client['post'] as any;

			await client.create({
				pipelineName: 'Complete Pipeline',
				sourceConnectorID: '100',
				targetConnectorID: '200',
				institutionID: 1,
				internalID: 'test-proj',
				ownerID: 42,
				targetSchemaName: 'raw',
				isPrivate: 1,
				items: [
					{
						sourceDatabaseName: 'source_db',
						sourceTableName: 'users',
						targetDatabaseName: 'target_db',
						targetSchemaName: 'public'
					}
				]
			});

			const [_, payload] = postMock.mock.calls[0];

			// Required fields
			expect(payload.institutionID).toBe(1);
			expect(payload.internalID).toBe('test-proj');
			expect(payload.ownerID).toBe(42);
			expect(payload.pipelineName).toBe('Complete Pipeline');
			expect(payload.isPrivate).toBe(1);

			// NOTE: sourceConnectorID and targetConnectorID are NOT at pipeline level
			// They only exist at artifact level as sourceConnectionID/targetConnectionID
			expect(payload.sourceConnectorID).toBeUndefined();
			expect(payload.targetConnectorID).toBeUndefined();

			// Pattern settings
			expect(payload.ingestionPattern).toBe('datalake'); // Snowflake target
			expect(payload.sourceNamingConvention).toBe(false);
			expect(payload.createCatalogs).toBe(true);

			// Technology
			expect(payload.connectorTechnology).toEqual(['mysql']);

			// Target settings
			expect(payload.targetCatalogName).toBe('');
			expect(payload.targetSchemaName).toBe('raw');

			// Job details
			expect(payload.jobDetails).toBeDefined();
			expect(payload.jobDetails.jobTimeout).toBe('43200');

			// Items
			expect(payload.items).toHaveLength(1);
		});
	});
});
