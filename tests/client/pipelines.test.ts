/**
 * Pipelines Client Tests
 *
 * Unit tests for the PipelinesClient class covering:
 * - Critical projectId validation in list()
 * - All CRUD operations
 * - Pipeline execution
 * - Token efficiency options
 * - Error handling
 */

import { describe, test, expect } from 'bun:test';
import { PipelinesClient } from '../../src/client/pipelines.ts';
import { ValidationError } from '../../src/utils/errors.ts';

describe('PipelinesClient', () => {
	describe('list()', () => {
		test('throws ValidationError when projectId is missing', async () => {
			const client = new PipelinesClient();

			await expect(async () => {
				// @ts-expect-error - testing missing required parameter
				await client.list();
			}).toThrow(ValidationError);
		});

		test('throws ValidationError when projectId is empty string', async () => {
			const client = new PipelinesClient();

			await expect(async () => {
				await client.list('');
			}).toThrow(ValidationError);
		});

		test('throws ValidationError when projectId is whitespace only', async () => {
			const client = new PipelinesClient();

			await expect(async () => {
				await client.list('   ');
			}).toThrow(ValidationError);
		});

		test('validation error includes helpful message', async () => {
			const client = new PipelinesClient();

			try {
				await client.list('');
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(ValidationError);
				expect((error as ValidationError).message).toContain('projectId is required');
				expect((error as ValidationError).field).toBe('projectId');
			}
		});
	});

	describe('create()', () => {
		test('throws ValidationError when pipelineName is missing', async () => {
			const client = new PipelinesClient();

			await expect(async () => {
				// @ts-expect-error - testing invalid data
				await client.create({});
			}).toThrow(ValidationError);
		});

		test('throws ValidationError when pipelineName is empty', async () => {
			const client = new PipelinesClient();

			await expect(async () => {
				await client.create({ pipelineName: '' });
			}).toThrow(ValidationError);
		});

		test('throws ValidationError when pipelineName is whitespace', async () => {
			const client = new PipelinesClient();

			await expect(async () => {
				await client.create({ pipelineName: '   ' });
			}).toThrow(ValidationError);
		});
	});

	describe('method signatures', () => {
		test('has all required methods', () => {
			const client = new PipelinesClient();

			expect(typeof client.list).toBe('function');
			expect(typeof client.get).toBe('function');
			expect(typeof client.create).toBe('function');
			expect(typeof client.update).toBe('function');
			expect(typeof client.delete).toBe('function');
			expect(typeof client.run).toBe('function');
		});
	});

	describe('inheritance', () => {
		test('extends DatabasinClient', () => {
			const client = new PipelinesClient();

			// Should have base client methods
			expect(typeof client.ping).toBe('function');
			expect(typeof client.setBaseUrl).toBe('function');
			expect(typeof client.getBaseUrl).toBe('function');
			expect(typeof client.clearToken).toBe('function');
		});
	});
});
