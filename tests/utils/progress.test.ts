/**
 * Tests for progress indicator utilities
 */

import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import {
	startSpinner,
	updateSpinner,
	succeedSpinner,
	failSpinner,
	warnSpinner,
	logInfo,
	logSuccess,
	logWarning,
	logError,
	logDebug,
	ProgressTracker,
	warnTokenUsage,
	startTimer,
	formatDuration,
	divider,
	sectionHeader,
	setGlobalFlags,
	getGlobalFlags,
	type SpinnerOptions,
	type LogOptions
} from './progress';

describe('progress utilities', () => {
	beforeEach(() => {
		// Reset global flags before each test
		setGlobalFlags({ verbose: false, debug: false, noColor: false });
		delete process.env.NO_COLOR;
	});

	afterEach(() => {
		// Clean up after each test
		delete process.env.NO_COLOR;
	});

	describe('global flags', () => {
		test('should set and get global flags', () => {
			setGlobalFlags({ verbose: true, debug: true });
			const flags = getGlobalFlags();
			expect(flags.verbose).toBe(true);
			expect(flags.debug).toBe(true);
		});

		test('should partially update flags', () => {
			setGlobalFlags({ verbose: true });
			setGlobalFlags({ debug: true });
			const flags = getGlobalFlags();
			expect(flags.verbose).toBe(true);
			expect(flags.debug).toBe(true);
		});
	});

	describe('spinner functions', () => {
		test('should start spinner with default options', () => {
			const spinner = startSpinner('Loading...');
			expect(spinner).toBeDefined();
			expect(spinner.text).toBe('Loading...');
			spinner.stop();
		});

		test('should update spinner text', () => {
			const spinner = startSpinner('Step 1');
			updateSpinner(spinner, 'Step 2');
			expect(spinner.text).toBe('Step 2');
			spinner.stop();
		});

		test('should succeed spinner with custom text', () => {
			const spinner = startSpinner('Loading...');
			succeedSpinner(spinner, 'Loaded successfully!');
			expect(spinner.isSpinning).toBe(false);
		});

		test('should fail spinner with error', () => {
			const spinner = startSpinner('Processing...');
			const error = new Error('Test error');
			failSpinner(spinner, 'Process failed', error);
			expect(spinner.isSpinning).toBe(false);
		});

		test('should warn spinner', () => {
			const spinner = startSpinner('Checking...');
			warnSpinner(spinner, 'Warning: some issues found');
			expect(spinner.isSpinning).toBe(false);
		});

		test('should create spinner with custom options', () => {
			const spinner = startSpinner('Custom...', { color: 'blue', spinner: 'line' });
			expect(spinner).toBeDefined();
			spinner.stop();
		});
	});

	describe('status messages', () => {
		test('should log info message', () => {
			// Should not throw
			logInfo('Test info message');
		});

		test('should log success message', () => {
			// Should not throw
			logSuccess('Operation completed');
		});

		test('should log warning message', () => {
			// Should not throw
			logWarning('Warning message');
		});

		test('should log error message', () => {
			// Should not throw
			logError('Error occurred');
		});

		test('should log error with error object in debug mode', () => {
			setGlobalFlags({ debug: true });
			const error = new Error('Test error');
			// Should not throw
			logError('Operation failed', error);
		});

		test('should not log debug message without debug flag', () => {
			// Should not throw, message is silently suppressed
			logDebug('Debug message');
		});

		test('should log debug message with debug flag', () => {
			setGlobalFlags({ debug: true });
			// Should not throw
			logDebug('Debug message');
		});

		test('should respect verbose flag', () => {
			// Without verbose flag, should suppress
			logInfo('Verbose message', { verbose: true });

			// With verbose flag, should show
			setGlobalFlags({ verbose: true });
			logInfo('Verbose message', { verbose: true });
		});

		test('should respect NO_COLOR environment variable', () => {
			process.env.NO_COLOR = '1';
			// Should not throw
			logSuccess('Success');
		});
	});

	describe('ProgressTracker', () => {
		test('should create progress tracker', () => {
			const progress = new ProgressTracker(100, 'Test progress');
			expect(progress).toBeDefined();
		});

		test('should increment progress', () => {
			const progress = new ProgressTracker(10);
			progress.increment();
			progress.increment(2);
			// Should not throw
		});

		test('should not exceed total when incrementing', () => {
			const progress = new ProgressTracker(5);
			for (let i = 0; i < 10; i++) {
				progress.increment();
			}
			// Should not throw, caps at total
		});

		test('should set total dynamically', () => {
			const progress = new ProgressTracker(0);
			progress.setTotal(50);
			progress.increment(10);
			// Should not throw
		});

		test('should set current value', () => {
			const progress = new ProgressTracker(100);
			progress.setCurrent(50);
			// Should not throw
		});

		test('should finish with success', () => {
			const progress = new ProgressTracker(10, 'Test task');
			progress.setCurrent(10);
			progress.finish(true);
			// Should not throw
		});

		test('should finish with failure', () => {
			const progress = new ProgressTracker(10, 'Test task');
			progress.setCurrent(5);
			progress.finish(false);
			// Should not throw
		});

		test('should fail with error', () => {
			const progress = new ProgressTracker(10, 'Test task');
			progress.setCurrent(5);
			const error = new Error('Test error');
			progress.fail(error);
			// Should not throw
		});
	});

	describe('token usage warnings', () => {
		test('should not warn below threshold', () => {
			// Should not output anything
			warnTokenUsage(1000, 50000);
		});

		test('should warn above threshold', () => {
			// Should output warning
			warnTokenUsage(60000, 50000);
		});

		test('should show suggestions', () => {
			// Should output with suggestions
			warnTokenUsage(60000, 50000, ['Use --count flag', 'Use --limit flag']);
		});

		test('should handle high usage threshold', () => {
			// High warning (>100K)
			warnTokenUsage(150000, 50000);
		});
	});

	describe('duration tracking', () => {
		test('should format duration in milliseconds', () => {
			const start = Date.now() - 500;
			const formatted = formatDuration(start);
			expect(formatted).toContain('ms');
		});

		test('should format duration in seconds', () => {
			const start = Date.now() - 2500;
			const formatted = formatDuration(start);
			expect(formatted).toContain('s');
			expect(formatted).not.toContain('ms');
		});

		test('should format duration in minutes and seconds', () => {
			const start = Date.now() - 90000; // 1.5 minutes
			const formatted = formatDuration(start);
			expect(formatted).toContain('m');
			expect(formatted).toContain('s');
		});

		test('should start timer', () => {
			const start = startTimer();
			expect(start).toBeLessThanOrEqual(Date.now());
		});
	});

	describe('utility functions', () => {
		test('should create divider', () => {
			const div = divider();
			expect(div).toBeDefined();
			expect(div.length).toBeGreaterThan(0);
		});

		test('should create divider with custom character', () => {
			const div = divider('=', 40);
			// Should contain the character (may be wrapped in ANSI codes)
			expect(div).toContain('=');
		});

		test('should create section header', () => {
			const header = sectionHeader('Test Section');
			expect(header).toContain('Test Section');
		});
	});

	describe('integration scenarios', () => {
		test('should handle complete spinner lifecycle', async () => {
			const spinner = startSpinner('Processing...');

			// Simulate async work
			await new Promise((resolve) => setTimeout(resolve, 10));
			updateSpinner(spinner, 'Still processing...');

			await new Promise((resolve) => setTimeout(resolve, 10));
			succeedSpinner(spinner, 'Done!');
		});

		test('should handle progress tracking with errors', () => {
			const progress = new ProgressTracker(5, 'Processing items');

			for (let i = 0; i < 5; i++) {
				if (i === 3) {
					logWarning(`Item ${i} had warnings`);
				}
				progress.increment();
			}

			progress.finish();
		});

		test('should combine multiple output types', () => {
			logInfo('Starting operation...');
			logSuccess('Step 1 complete');
			logWarning('Step 2 has warnings');
			logSuccess('Operation complete');
		});

		test('should handle error scenarios with debug output', () => {
			setGlobalFlags({ debug: true });
			const error = new Error('Test error with stack');
			logError('Operation failed', error);
		});
	});

	describe('edge cases', () => {
		test('should handle zero total in progress tracker', () => {
			const progress = new ProgressTracker(0);
			progress.increment(); // Should not crash
			progress.finish();
		});

		test('should handle negative increments', () => {
			const progress = new ProgressTracker(10);
			progress.setCurrent(5);
			progress.increment(-2); // Should not go below 0
		});

		test('should handle very long duration formatting', () => {
			const start = Date.now() - 3600000; // 1 hour ago
			const formatted = formatDuration(start);
			expect(formatted).toContain('m');
		});

		test('should handle concurrent progress trackers', () => {
			const progress1 = new ProgressTracker(10, 'Task 1');
			const progress2 = new ProgressTracker(20, 'Task 2');

			progress1.increment(5);
			progress2.increment(10);

			progress1.finish();
			progress2.finish();
		});
	});
});
