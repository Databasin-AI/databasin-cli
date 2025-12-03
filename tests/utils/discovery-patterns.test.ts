/**
 * Unit tests for discovery pattern validation
 *
 * Tests the configuration validation functions to ensure they catch
 * errors early and provide helpful error messages.
 */

import { describe, expect, test } from 'bun:test';
import { validateConnectorConfiguration, assertValidConfiguration } from './discovery-patterns.js';
import { SCREEN_CATALOGS, SCREEN_DATABASE, SCREEN_SCHEMA, SCREEN_ARTIFACTS } from '../constants/screens.js';

describe('Configuration Validation', () => {
	test('Valid RDBMS configuration passes', () => {
		const config = {
			connectorName: 'MySQL',
			pipelineRequiredScreens: [SCREEN_CATALOGS, SCREEN_ARTIFACTS, 3, 4, 5],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('Valid lakehouse configuration passes', () => {
		const config = {
			connectorName: 'Postgres',
			pipelineRequiredScreens: [SCREEN_DATABASE, SCREEN_SCHEMA, SCREEN_ARTIFACTS, 3, 4, 5],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('Missing pipelineRequiredScreens fails', () => {
		const config = {
			connectorName: 'Test',
			active: true
		} as any;

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Missing pipelineRequiredScreens array');
	});

	test('Null configuration fails', () => {
		const result = validateConnectorConfiguration(null as any);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Configuration is null or undefined');
	});

	test('Undefined configuration fails', () => {
		const result = validateConnectorConfiguration(undefined as any);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Configuration is null or undefined');
	});

	test('Invalid screens array fails', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: 'not an array' as any,
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('pipelineRequiredScreens is not an array');
	});

	test('Missing connectorName produces error', () => {
		const config = {
			pipelineRequiredScreens: [1, 2, 3],
			active: true
		} as any;

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('connectorName'))).toBe(true);
	});

	test('Empty screens array produces warning', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.warnings.some(w => w.includes('empty'))).toBe(true);
	});

	test('Conflicting patterns produces warning', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [SCREEN_CATALOGS, SCREEN_DATABASE, SCREEN_SCHEMA],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.warnings.length).toBeGreaterThan(0);
		expect(result.warnings.some(w => w.includes('both') && w.includes('precedence'))).toBe(true);
	});

	test('Incomplete lakehouse pattern produces warning', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [SCREEN_DATABASE],  // Missing SCREEN_SCHEMA
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.warnings.some(w => w.includes('incomplete lakehouse'))).toBe(true);
	});

	test('Schema without parent screen produces warning', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [SCREEN_SCHEMA, 3, 4, 5],  // No parent screen
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.warnings.some(w => w.includes('parent screen'))).toBe(true);
	});

	test('Orphaned artifact screen produces warning', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [SCREEN_ARTIFACTS, 3, 4, 5],  // No schema screen
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.warnings.some(w => w.includes('artifact') && w.includes('schema context'))).toBe(true);
	});

	test('Invalid screen IDs fail', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [1, -5, 'invalid' as any, 0],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('Invalid screen IDs'))).toBe(true);
	});

	test('Negative screen ID fails', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [1, 2, -1],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('Invalid screen IDs'))).toBe(true);
	});

	test('Zero screen ID fails', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [0, 1, 2],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('Invalid screen IDs'))).toBe(true);
	});

	test('Non-integer screen ID fails', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [1.5, 2, 3],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(false);
		expect(result.errors.some(e => e.includes('Invalid screen IDs'))).toBe(true);
	});

	test('Duplicate screens produces warning', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [1, 2, 1, 3],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.warnings.some(w => w.includes('duplicate'))).toBe(true);
	});

	test('Multiple duplicates produces warning', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [1, 2, 1, 2, 3, 3],
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.warnings.some(w => w.includes('duplicate'))).toBe(true);
	});

	test('assertValidConfiguration throws on invalid config', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: null as any,
			active: true
		};

		expect(() => assertValidConfiguration(config)).toThrow('Invalid connector configuration');
	});

	test('assertValidConfiguration throws with error details', () => {
		const config = {
			pipelineRequiredScreens: null as any,
			active: true
		} as any;

		try {
			assertValidConfiguration(config);
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(error).toBeDefined();
			expect((error as Error).message).toContain('Invalid connector configuration');
			expect((error as Error).message).toContain('Missing connectorName');
		}
	});

	test('assertValidConfiguration succeeds on valid config', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [1, 2, 3],
			active: true
		};

		expect(() => assertValidConfiguration(config)).not.toThrow();
	});

	test('assertValidConfiguration succeeds on valid lakehouse config', () => {
		const config = {
			connectorName: 'Postgres',
			pipelineRequiredScreens: [SCREEN_DATABASE, SCREEN_SCHEMA, SCREEN_ARTIFACTS, 3, 4, 5],
			active: true
		};

		expect(() => assertValidConfiguration(config)).not.toThrow();
	});

	test('Complex valid configuration passes', () => {
		const config = {
			connectorName: 'Databricks',
			pipelineRequiredScreens: [6, 7, 2, 3, 4, 5],
			active: true,
			extraField: 'allowed' // Extra fields should not cause validation to fail
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('Configuration with warnings is still valid', () => {
		const config = {
			connectorName: 'Test',
			pipelineRequiredScreens: [1, 2, 1],  // Has duplicate
			active: true
		};

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(true);  // Warnings don't invalidate
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	test('Multiple errors are all reported', () => {
		const config = {
			// Missing connectorName
			pipelineRequiredScreens: [1, -5, 0],  // Has invalid screen IDs
			active: true
		} as any;

		const result = validateConnectorConfiguration(config);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(1);
		expect(result.errors.some(e => e.includes('connectorName'))).toBe(true);
		expect(result.errors.some(e => e.includes('Invalid screen IDs'))).toBe(true);
	});
});
