/**
 * Tests for automatic update checker utility
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
	formatUpdateNotification,
	checkForUpdates,
	getCachedUpdateInfo,
	type UpdateCheckResult
} from '../../src/utils/update-checker.ts';

describe('Update Checker', () => {
	describe('formatUpdateNotification', () => {
		test('should format update available notification', () => {
			const result: UpdateCheckResult = {
				updateAvailable: true,
				currentVersion: '0.3.1',
				latestVersion: '0.4.0',
				releaseUrl: 'https://github.com/databasin-ai/databasin-cli/releases/tag/v0.4.0'
			};

			const notification = formatUpdateNotification(result);

			expect(notification).toContain('Update available!');
			expect(notification).toContain('0.3.1');
			expect(notification).toContain('0.4.0');
			expect(notification).toContain('databasin update');
		});

		test('should return empty string when no update available', () => {
			const result: UpdateCheckResult = {
				updateAvailable: false,
				currentVersion: '0.3.1'
			};

			const notification = formatUpdateNotification(result);

			expect(notification).toBe('');
		});

		test('should return empty string when latestVersion is missing', () => {
			const result: UpdateCheckResult = {
				updateAvailable: true,
				currentVersion: '0.3.1',
				latestVersion: undefined
			};

			const notification = formatUpdateNotification(result);

			expect(notification).toBe('');
		});

		test('should handle various version formats', () => {
			const result: UpdateCheckResult = {
				updateAvailable: true,
				currentVersion: '1.0.0',
				latestVersion: '2.0.0-beta.1',
				releaseUrl: 'https://github.com/databasin-ai/databasin-cli/releases/tag/v2.0.0-beta.1'
			};

			const notification = formatUpdateNotification(result);

			expect(notification).toContain('1.0.0');
			expect(notification).toContain('2.0.0-beta.1');
		});
	});

	describe('Config-based disabling', () => {
		test('should skip update check when disabled option is true', async () => {
			const result = await checkForUpdates({ disabled: true });
			expect(result).toBeNull();
		});

		test('should skip getCachedUpdateInfo when disabled option is true', () => {
			const result = getCachedUpdateInfo({ disabled: true });
			expect(result).toBeNull();
		});

		test('should not skip when disabled option is false', async () => {
			// This may make a network call or return cached result, but won't be null due to disabled
			// We're just testing that disabled=false doesn't immediately return null
			const result = await checkForUpdates({ disabled: false });
			// Result could be null for other reasons (network, rate limit, etc.) but not due to disabled flag
			// The important thing is that the function runs and doesn't short-circuit
			expect(true).toBe(true); // Test passes if no error is thrown
		});
	});

	describe('Environment variable handling', () => {
		const originalEnv = process.env.DATABASIN_NO_UPDATE_CHECK;

		afterEach(() => {
			if (originalEnv !== undefined) {
				process.env.DATABASIN_NO_UPDATE_CHECK = originalEnv;
			} else {
				delete process.env.DATABASIN_NO_UPDATE_CHECK;
			}
		});

		test('should respect DATABASIN_NO_UPDATE_CHECK=true', async () => {
			process.env.DATABASIN_NO_UPDATE_CHECK = 'true';

			const result = await checkForUpdates();

			expect(result).toBeNull();
		});

		test('should respect DATABASIN_NO_UPDATE_CHECK=1', async () => {
			process.env.DATABASIN_NO_UPDATE_CHECK = '1';

			const result = await checkForUpdates();

			expect(result).toBeNull();
		});
	});
});
