/**
 * Pipeline Job Details Tests
 *
 * Tests for JobDetails interface and default job configuration.
 * Ensures job details match frontend wizard defaults exactly.
 *
 * @module tests/unit/pipelines-jobdetails
 */

import { describe, test, expect } from 'bun:test';
import type { JobDetails } from '../../src/types/api.ts';
import { PipelinesClient } from '../../src/client/pipelines.ts';

describe('JobDetails Interface', () => {
	test('has correct type structure', () => {
		// Type check - this will fail compilation if interface changes
		const jobDetails: JobDetails = {
			tags: [],
			jobClusterSize: 'S',
			emailNotifications: [],
			jobRunSchedule: null,
			jobRunTimeZone: 'UTC',
			jobTimeout: '43200'
		};

		expect(jobDetails).toBeDefined();
		expect(Array.isArray(jobDetails.tags)).toBe(true);
		expect(Array.isArray(jobDetails.emailNotifications)).toBe(true);
	});

	test('accepts all valid cluster sizes', () => {
		const sizes: Array<'S' | 'M' | 'L' | 'XL'> = ['S', 'M', 'L', 'XL'];

		sizes.forEach((size) => {
			const jobDetails: JobDetails = {
				tags: [],
				jobClusterSize: size,
				emailNotifications: [],
				jobRunSchedule: null,
				jobRunTimeZone: 'UTC',
				jobTimeout: '43200'
			};

			expect(jobDetails.jobClusterSize).toBe(size);
		});
	});

	test('jobTimeout must be string type', () => {
		const jobDetails: JobDetails = {
			tags: [],
			jobClusterSize: 'S',
			emailNotifications: [],
			jobRunSchedule: null,
			jobRunTimeZone: 'UTC',
			jobTimeout: '43200'
		};

		// CRITICAL: Must be string, not number
		expect(typeof jobDetails.jobTimeout).toBe('string');
	});

	test('jobRunSchedule can be null or string', () => {
		const withSchedule: JobDetails = {
			tags: [],
			jobClusterSize: 'S',
			emailNotifications: [],
			jobRunSchedule: '0 10 * * *',
			jobRunTimeZone: 'UTC',
			jobTimeout: '43200'
		};

		const withoutSchedule: JobDetails = {
			tags: [],
			jobClusterSize: 'S',
			emailNotifications: [],
			jobRunSchedule: null,
			jobRunTimeZone: 'UTC',
			jobTimeout: '43200'
		};

		expect(withSchedule.jobRunSchedule).toBe('0 10 * * *');
		expect(withoutSchedule.jobRunSchedule).toBeNull();
	});
});

describe('PipelinesClient - getDefaultJobDetails', () => {
	describe('default values', () => {
		test('returns correct default structure', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			expect(defaults).toMatchObject({
				tags: [],
				jobClusterSize: 'S',
				emailNotifications: [],
				jobRunSchedule: '0 10 * * *',
				jobRunTimeZone: 'UTC',
				jobTimeout: '43200'
			});
		});

		test('tags default to empty array', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			expect(defaults.tags).toEqual([]);
			expect(Array.isArray(defaults.tags)).toBe(true);
		});

		test('jobClusterSize defaults to S (Small)', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			expect(defaults.jobClusterSize).toBe('S');
		});

		test('jobRunSchedule defaults to 10 AM UTC daily', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			expect(defaults.jobRunSchedule).toBe('0 10 * * *');
		});

		test('jobRunTimeZone defaults to UTC', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			expect(defaults.jobRunTimeZone).toBe('UTC');
		});

		test('jobTimeout defaults to 43200 seconds (12 hours) as string', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			expect(defaults.jobTimeout).toBe('43200');
			expect(typeof defaults.jobTimeout).toBe('string');
		});
	});

	describe('email notifications', () => {
		test('includes user email when provided', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails('user@example.com');

			expect(defaults.emailNotifications).toEqual(['user@example.com']);
			expect(defaults.emailNotifications.length).toBe(1);
		});

		test('empty array when no email provided', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			expect(defaults.emailNotifications).toEqual([]);
			expect(defaults.emailNotifications.length).toBe(0);
		});

		test('empty array when undefined email provided', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails(undefined);

			expect(defaults.emailNotifications).toEqual([]);
		});

		test('empty array when null email provided', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails(null);

			expect(defaults.emailNotifications).toEqual([]);
		});

		test('handles multiple calls with different emails', () => {
			const client = new PipelinesClient();

			const defaults1 = (client as any).getDefaultJobDetails('user1@example.com');
			expect(defaults1.emailNotifications).toEqual(['user1@example.com']);

			const defaults2 = (client as any).getDefaultJobDetails('user2@example.com');
			expect(defaults2.emailNotifications).toEqual(['user2@example.com']);

			const defaults3 = (client as any).getDefaultJobDetails();
			expect(defaults3.emailNotifications).toEqual([]);
		});
	});

	describe('frontend parity', () => {
		test('matches PipelineCreationWizardViewModel defaults exactly', () => {
			// Reference: PipelineCreationWizardViewModel.svelte.js:175-182
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails('user@example.com');

			// Frontend defaults:
			// tags: []
			// jobClusterSize: 'S'
			// emailNotifications: [this.currentUser?.email] or []
			// jobRunSchedule: '0 10 * * *'
			// jobRunTimeZone: 'UTC'
			// jobTimeout: 43200 (but CLI uses string)

			expect(defaults).toEqual({
				tags: [],
				jobClusterSize: 'S',
				emailNotifications: ['user@example.com'],
				jobRunSchedule: '0 10 * * *',
				jobRunTimeZone: 'UTC',
				jobTimeout: '43200'
			});
		});

		test('timeout value matches frontend (12 hours)', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			// Frontend uses: jobTimeout: 43200
			// CLI uses string version: '43200'
			// Both represent 12 hours in seconds
			expect(defaults.jobTimeout).toBe('43200');
			expect(parseInt(defaults.jobTimeout)).toBe(43200);
			expect(parseInt(defaults.jobTimeout) / 3600).toBe(12); // 12 hours
		});
	});

	describe('type safety', () => {
		test('returns object conforming to JobDetails interface', () => {
			const client = new PipelinesClient();
			const defaults: JobDetails = (client as any).getDefaultJobDetails();

			// Type assertion should not fail
			expect(defaults).toBeDefined();
			expect(typeof defaults.tags).toBe('object');
			expect(typeof defaults.jobClusterSize).toBe('string');
			expect(typeof defaults.emailNotifications).toBe('object');
			expect(typeof defaults.jobRunTimeZone).toBe('string');
			expect(typeof defaults.jobTimeout).toBe('string');
		});

		test('jobTimeout type is strictly string', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			// This is CRITICAL - backend expects string
			expect(defaults.jobTimeout).toBe('43200');
			expect(defaults.jobTimeout).not.toBe(43200);
			expect(typeof defaults.jobTimeout).toBe('string');
			expect(typeof defaults.jobTimeout).not.toBe('number');
		});

		test('all string arrays are properly typed', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails('test@example.com');

			expect(Array.isArray(defaults.tags)).toBe(true);
			expect(Array.isArray(defaults.emailNotifications)).toBe(true);

			defaults.tags.forEach((tag: unknown) => {
				expect(typeof tag).toBe('string');
			});

			defaults.emailNotifications.forEach((email: unknown) => {
				expect(typeof email).toBe('string');
			});
		});
	});

	describe('validation rules', () => {
		test('cron expression is valid format', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			// Cron format: minute hour day month weekday
			const cronPattern = /^\d+\s+\d+\s+\*\s+\*\s+\*$/;
			expect(defaults.jobRunSchedule).toMatch(cronPattern);
		});

		test('cluster size is valid enum value', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			const validSizes = ['S', 'M', 'L', 'XL'];
			expect(validSizes).toContain(defaults.jobClusterSize);
		});

		test('timezone is valid IANA timezone', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			// Should be valid IANA timezone identifier
			// UTC is always valid
			expect(defaults.jobRunTimeZone).toBe('UTC');
		});

		test('timeout is positive numeric string', () => {
			const client = new PipelinesClient();
			const defaults = (client as any).getDefaultJobDetails();

			const timeoutNumber = parseInt(defaults.jobTimeout);
			expect(timeoutNumber).toBeGreaterThan(0);
			expect(isNaN(timeoutNumber)).toBe(false);
		});
	});

	describe('immutability', () => {
		test('returns new object on each call', () => {
			const client = new PipelinesClient();

			const defaults1 = (client as any).getDefaultJobDetails();
			const defaults2 = (client as any).getDefaultJobDetails();

			// Should be different object instances
			expect(defaults1).not.toBe(defaults2);

			// But should have same values
			expect(defaults1).toEqual(defaults2);
		});

		test('modifying returned object does not affect subsequent calls', () => {
			const client = new PipelinesClient();

			const defaults1 = (client as any).getDefaultJobDetails();
			defaults1.tags.push('modified');
			defaults1.jobClusterSize = 'XL';

			const defaults2 = (client as any).getDefaultJobDetails();

			expect(defaults2.tags).toEqual([]);
			expect(defaults2.jobClusterSize).toBe('S');
		});
	});
});
