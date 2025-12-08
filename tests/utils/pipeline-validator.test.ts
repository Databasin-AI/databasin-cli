/**
 * Pipeline Validator Tests
 *
 * Comprehensive test coverage for pipeline configuration validation including:
 * - Required field validation
 * - Connector existence checks
 * - Cron expression validation
 * - Name validation
 * - Warnings for missing artifacts and same-connector pipelines
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
	validatePipelineConfig,
	isValidCronExpression,
	type PipelineConfig,
	type ValidationClients
} from '../../src/utils/pipeline-validator';
import type { ConnectorsClient } from '../../src/client/connectors';

/**
 * Mock connectors client for testing
 */
function createMockConnectorsClient(
	existingConnectorIds: string[] = ['123', '456']
): ConnectorsClient {
	return {
		get: async (id: string) => {
			if (existingConnectorIds.includes(id)) {
				return { connectorID: id, connectorName: `Connector ${id}` };
			}
			throw new Error('404: Connector not found');
		}
	} as ConnectorsClient;
}

/**
 * Create mock validation clients
 */
function createMockClients(existingConnectorIds?: string[]): ValidationClients {
	return {
		connectors: createMockConnectorsClient(existingConnectorIds)
	};
}

describe('validatePipelineConfig', () => {
	// Required field validation tests
	describe('required fields validation', () => {
		test('validates required pipelineName', async () => {
			const config: PipelineConfig = {
				sourceConnectorId: '123',
				targetConnectorId: '456'
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual({
				field: 'pipelineName',
				message: 'Pipeline name is required',
				severity: 'error'
			});
		});

		test('validates required sourceConnectorId', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				targetConnectorId: '456'
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual({
				field: 'sourceConnectorId',
				message: 'Source connector ID is required',
				severity: 'error'
			});
		});

		test('validates required targetConnectorId', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123'
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual({
				field: 'targetConnectorId',
				message: 'Target connector ID is required',
				severity: 'error'
			});
		});

		test('validates all required fields missing', async () => {
			const config: PipelineConfig = {};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(3);
			expect(result.errors.some((e) => e.field === 'pipelineName')).toBe(true);
			expect(result.errors.some((e) => e.field === 'sourceConnectorId')).toBe(true);
			expect(result.errors.some((e) => e.field === 'targetConnectorId')).toBe(true);
		});
	});

	// Connector existence checks
	describe('connector existence validation', () => {
		test('validates source connector exists', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '999', // Non-existent
				targetConnectorId: '456'
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(false);
			const sourceError = result.errors.find((e) => e.field === 'sourceConnectorId');
			expect(sourceError).toBeDefined();
			expect(sourceError?.message).toContain('not found or inaccessible');
		});

		test('validates target connector exists', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '999' // Non-existent
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(false);
			const targetError = result.errors.find((e) => e.field === 'targetConnectorId');
			expect(targetError).toBeDefined();
			expect(targetError?.message).toContain('not found or inaccessible');
		});

		test('validates both connectors exist', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '999', // Non-existent
				targetConnectorId: '888' // Non-existent
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.field === 'sourceConnectorId')).toBe(true);
			expect(result.errors.some((e) => e.field === 'targetConnectorId')).toBe(true);
		});

		test('passes when both connectors exist', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '456',
				artifacts: [{ sourceTable: 'test', targetTable: 'test' }]
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(true);
			expect(result.errors.length).toBe(0);
		});

		test('handles numeric connector IDs', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: 123,
				targetConnectorId: 456,
				artifacts: [{ sourceTable: 'test', targetTable: 'test' }]
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(true);
		});
	});

	// Name validation tests
	describe('pipeline name validation', () => {
		test('rejects pipeline name shorter than 3 characters', async () => {
			const config: PipelineConfig = {
				pipelineName: 'ab',
				sourceConnectorId: '123',
				targetConnectorId: '456'
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual({
				field: 'pipelineName',
				message: 'Pipeline name must be at least 3 characters',
				severity: 'error'
			});
		});

		test('rejects pipeline name longer than 100 characters', async () => {
			const config: PipelineConfig = {
				pipelineName: 'a'.repeat(101),
				sourceConnectorId: '123',
				targetConnectorId: '456'
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual({
				field: 'pipelineName',
				message: 'Pipeline name must be less than 100 characters',
				severity: 'error'
			});
		});

		test('accepts valid pipeline name lengths', async () => {
			const validNames = ['abc', 'Test Pipeline', 'A Very Long Pipeline Name But Still Valid', 'a'.repeat(100)];

			for (const name of validNames) {
				const config: PipelineConfig = {
					pipelineName: name,
					sourceConnectorId: '123',
					targetConnectorId: '456',
					artifacts: [{ sourceTable: 'test', targetTable: 'test' }]
				};
				const result = await validatePipelineConfig(config, createMockClients());

				expect(result.errors.some((e) => e.field === 'pipelineName')).toBe(false);
			}
		});
	});

	// Warnings tests
	describe('validation warnings', () => {
		test('warns when no artifacts configured', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '456'
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(true); // Still valid, just a warning
			expect(result.warnings).toContainEqual({
				field: 'artifacts',
				message: 'No artifacts configured - pipeline will not transfer any data',
				severity: 'warning'
			});
		});

		test('warns when empty artifacts array', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '456',
				artifacts: []
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(true);
			expect(result.warnings).toContainEqual({
				field: 'artifacts',
				message: 'No artifacts configured - pipeline will not transfer any data',
				severity: 'warning'
			});
		});

		test('warns when source and target are same connector', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '123', // Same as source
				artifacts: [{ sourceTable: 'test', targetTable: 'test' }]
			};
			const result = await validatePipelineConfig(config, createMockClients(['123']));

			expect(result.valid).toBe(true);
			expect(result.warnings).toContainEqual({
				field: 'sourceConnectorId, targetConnectorId',
				message: 'Source and target connectors are the same - this is unusual but allowed',
				severity: 'warning'
			});
		});

		test('warns when artifact missing sourceQuery and sourceTable', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '456',
				artifacts: [{ targetTable: 'test' }]
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(true);
			expect(result.warnings.some((w) => w.field === 'artifacts[0]' && w.message.includes('sourceQuery or sourceTable'))).toBe(true);
		});

		test('warns when artifact missing targetTable', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '456',
				artifacts: [{ sourceTable: 'test' }]
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(true);
			expect(result.warnings.some((w) => w.field === 'artifacts[0]' && w.message.includes('targetTable'))).toBe(true);
		});

		test('no warnings for complete artifacts', async () => {
			const config: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '456',
				artifacts: [
					{ sourceTable: 'source1', targetTable: 'target1' },
					{ sourceQuery: 'SELECT * FROM source2', targetTable: 'target2' }
				]
			};
			const result = await validatePipelineConfig(config, createMockClients());

			expect(result.valid).toBe(true);
			expect(result.warnings.filter((w) => w.field.startsWith('artifacts'))).toHaveLength(0);
		});
	});

	// Valid configuration tests
	describe('valid configuration acceptance', () => {
		test('validates complete valid config', async () => {
			const validConfig: PipelineConfig = {
				pipelineName: 'Test Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '456',
				schedule: '0 2 * * *',
				artifacts: [{ sourceTable: 'test', targetTable: 'test' }]
			};

			const result = await validatePipelineConfig(validConfig, createMockClients());

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		test('validates minimal valid config', async () => {
			const minimalConfig: PipelineConfig = {
				pipelineName: 'Minimal',
				sourceConnectorId: '123',
				targetConnectorId: '456',
				artifacts: [{ sourceTable: 'test', targetTable: 'test' }]
			};

			const result = await validatePipelineConfig(minimalConfig, createMockClients());

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		test('validates config with additional fields', async () => {
			const extendedConfig: PipelineConfig = {
				pipelineName: 'Extended Pipeline',
				sourceConnectorId: '123',
				targetConnectorId: '456',
				schedule: '*/15 * * * *',
				artifacts: [
					{ sourceTable: 'table1', targetTable: 'table1' },
					{ sourceQuery: 'SELECT * FROM table2', targetTable: 'table2' }
				],
				description: 'This is a test pipeline',
				enabled: true,
				extraField: 'custom value'
			};

			const result = await validatePipelineConfig(extendedConfig, createMockClients());

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});
});

describe('isValidCronExpression', () => {
	describe('wildcard validation', () => {
		test('validates all wildcards', () => {
			expect(isValidCronExpression('* * * * *')).toBe(true);
		});

		test('validates wildcards with 6 fields', () => {
			expect(isValidCronExpression('* * * * * *')).toBe(true);
		});
	});

	describe('specific values validation', () => {
		test('validates midnight daily', () => {
			expect(isValidCronExpression('0 0 * * *')).toBe(true);
		});

		test('validates 2am daily', () => {
			expect(isValidCronExpression('0 2 * * *')).toBe(true);
		});

		test('validates specific time', () => {
			expect(isValidCronExpression('30 14 1 * *')).toBe(true);
		});

		test('validates all specific values', () => {
			expect(isValidCronExpression('15 10 5 6 3')).toBe(true);
		});

		test('validates with year field', () => {
			expect(isValidCronExpression('0 0 1 1 * 2025')).toBe(true);
		});
	});

	describe('range validation', () => {
		test('validates business hours', () => {
			expect(isValidCronExpression('0 9-17 * * *')).toBe(true);
		});

		test('validates weekday range', () => {
			expect(isValidCronExpression('0 0 * * 1-5')).toBe(true);
		});

		test('validates minute range', () => {
			expect(isValidCronExpression('0-30 * * * *')).toBe(true);
		});

		test('validates all fields with ranges', () => {
			expect(isValidCronExpression('0-15 9-17 1-15 1-6 1-5')).toBe(true);
		});
	});

	describe('step validation', () => {
		test('validates every 5 minutes', () => {
			expect(isValidCronExpression('*/5 * * * *')).toBe(true);
		});

		test('validates every 15 minutes', () => {
			expect(isValidCronExpression('*/15 * * * *')).toBe(true);
		});

		test('validates every 2 hours', () => {
			expect(isValidCronExpression('0 */2 * * *')).toBe(true);
		});

		test('validates range with step', () => {
			expect(isValidCronExpression('0 9-17/2 * * *')).toBe(true);
		});

		test('validates multiple steps', () => {
			expect(isValidCronExpression('*/10 */2 */5 * *')).toBe(true);
		});
	});

	describe('list validation', () => {
		test('validates first and fifteenth of month', () => {
			expect(isValidCronExpression('0 0 1,15 * *')).toBe(true);
		});

		test('validates specific hours', () => {
			expect(isValidCronExpression('0 6,12,18 * * *')).toBe(true);
		});

		test('validates weekday list', () => {
			expect(isValidCronExpression('0 0 * * 1,3,5')).toBe(true);
		});

		test('validates complex list', () => {
			expect(isValidCronExpression('0,15,30,45 * * * *')).toBe(true);
		});
	});

	describe('combined syntax validation', () => {
		test('validates range and list combination', () => {
			expect(isValidCronExpression('0 9-17,20 * * *')).toBe(true);
		});

		test('validates complex weekday pattern', () => {
			expect(isValidCronExpression('0 9 * * 1-5,0')).toBe(true);
		});

		test('validates multiple syntax types', () => {
			expect(isValidCronExpression('*/15 9-17 1,15 * 1-5')).toBe(true);
		});
	});

	describe('field count validation', () => {
		test('rejects too few fields', () => {
			expect(isValidCronExpression('* * *')).toBe(false);
		});

		test('rejects too many fields', () => {
			expect(isValidCronExpression('* * * * * * *')).toBe(false);
		});

		test('rejects single field', () => {
			expect(isValidCronExpression('*')).toBe(false);
		});

		test('rejects empty string', () => {
			expect(isValidCronExpression('')).toBe(false);
		});

		test('accepts 5 fields', () => {
			expect(isValidCronExpression('* * * * *')).toBe(true);
		});

		test('accepts 6 fields', () => {
			expect(isValidCronExpression('* * * * * *')).toBe(true);
		});
	});

	describe('out-of-range validation', () => {
		test('rejects minute > 59', () => {
			expect(isValidCronExpression('60 * * * *')).toBe(false);
		});

		test('rejects hour > 23', () => {
			expect(isValidCronExpression('* 24 * * *')).toBe(false);
		});

		test('rejects day > 31', () => {
			expect(isValidCronExpression('* * 32 * *')).toBe(false);
		});

		test('rejects day < 1', () => {
			expect(isValidCronExpression('* * 0 * *')).toBe(false);
		});

		test('rejects month > 12', () => {
			expect(isValidCronExpression('* * * 13 *')).toBe(false);
		});

		test('rejects month < 1', () => {
			expect(isValidCronExpression('* * * 0 *')).toBe(false);
		});

		test('rejects weekday > 6', () => {
			expect(isValidCronExpression('* * * * 7')).toBe(false);
		});

		test('rejects year < 1970', () => {
			expect(isValidCronExpression('* * * * * 1969')).toBe(false);
		});

		test('rejects year > 3000', () => {
			expect(isValidCronExpression('* * * * * 3001')).toBe(false);
		});

		test('accepts boundary values - minute', () => {
			expect(isValidCronExpression('0 * * * *')).toBe(true);
			expect(isValidCronExpression('59 * * * *')).toBe(true);
		});

		test('accepts boundary values - hour', () => {
			expect(isValidCronExpression('* 0 * * *')).toBe(true);
			expect(isValidCronExpression('* 23 * * *')).toBe(true);
		});

		test('accepts boundary values - day', () => {
			expect(isValidCronExpression('* * 1 * *')).toBe(true);
			expect(isValidCronExpression('* * 31 * *')).toBe(true);
		});

		test('accepts boundary values - month', () => {
			expect(isValidCronExpression('* * * 1 *')).toBe(true);
			expect(isValidCronExpression('* * * 12 *')).toBe(true);
		});

		test('accepts boundary values - weekday', () => {
			expect(isValidCronExpression('* * * * 0')).toBe(true);
			expect(isValidCronExpression('* * * * 6')).toBe(true);
		});

		test('accepts boundary values - year', () => {
			expect(isValidCronExpression('* * * * * 1970')).toBe(true);
			expect(isValidCronExpression('* * * * * 3000')).toBe(true);
		});
	});

	describe('invalid format validation', () => {
		test('rejects invalid characters', () => {
			expect(isValidCronExpression('invalid')).toBe(false);
		});

		test('rejects letters in numeric fields', () => {
			expect(isValidCronExpression('a * * * *')).toBe(false);
		});

		test('rejects malformed range', () => {
			expect(isValidCronExpression('10- * * * *')).toBe(false);
			expect(isValidCronExpression('-10 * * * *')).toBe(false);
		});

		test('rejects malformed step', () => {
			expect(isValidCronExpression('*/ * * * *')).toBe(false);
			expect(isValidCronExpression('*/a * * * *')).toBe(false);
		});

		test('rejects invalid range order', () => {
			expect(isValidCronExpression('30-10 * * * *')).toBe(false);
		});
	});
});
