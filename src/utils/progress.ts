/**
 * Progress indicator utilities for Databasin CLI
 *
 * Provides comprehensive progress tracking with spinners, progress bars,
 * status messages, token usage warnings, and duration tracking.
 *
 * @module utils/progress
 *
 * @example Basic spinner
 * ```typescript
 * const spinner = startSpinner('Fetching projects...');
 * try {
 *   const projects = await client.projects.list();
 *   succeedSpinner(spinner, `Fetched ${projects.length} projects`);
 * } catch (error) {
 *   failSpinner(spinner, 'Failed to fetch projects', error);
 * }
 * ```
 *
 * @example Progress bar for bulk operations
 * ```typescript
 * const progress = new ProgressTracker(items.length, 'Creating connectors');
 * for (const item of items) {
 *   try {
 *     await client.connectors.create(item);
 *     progress.increment();
 *   } catch (error) {
 *     logError(`Failed to create ${item.name}`, error);
 *   }
 * }
 * progress.finish();
 * ```
 *
 * @example Token usage warning
 * ```typescript
 * const response = await client.connectors.list();
 * warnTokenUsage(
 *   JSON.stringify(response).length,
 *   50000,
 *   ['Use --count flag to get count only', 'Use --fields to limit fields']
 * );
 * ```
 */

import ora, { type Ora } from 'ora';
import chalk from 'chalk';

/**
 * Options for configuring spinner behavior
 */
export interface SpinnerOptions {
	/** Color for the spinner (chalk color name) */
	color?: string;
	/** Ora spinner name (e.g., 'dots', 'line', 'arrow3') */
	spinner?: string;
	/** Output stream for the spinner */
	stream?: NodeJS.WriteStream;
}

/**
 * Options for log messages
 */
export interface LogOptions {
	/** Only show if verbose flag is enabled */
	verbose?: boolean;
	/** Only show if debug flag is enabled */
	debug?: boolean;
	/** Whether to use colors (defaults to true unless NO_COLOR env var) */
	colors?: boolean;
}

/**
 * Global flags set by CLI command options
 */
interface GlobalFlags {
	verbose: boolean;
	debug: boolean;
	noColor: boolean;
}

/**
 * Global flags for controlling output behavior
 * Set by CLI commands via setGlobalFlags()
 */
let globalFlags: GlobalFlags = {
	verbose: false,
	debug: false,
	noColor: false
};

/**
 * Detect if running in test environment
 */
function isTestEnvironment(): boolean {
	return process.env.NODE_ENV === 'test' ||
	       process.env.BUN_ENV === 'test' ||
	       typeof (globalThis as any).Bun?.jest !== 'undefined';
}

/**
 * Set global flags for output control
 * Called by CLI commands to configure output behavior
 *
 * @param flags - Global flags to set
 *
 * @example
 * ```typescript
 * setGlobalFlags({ verbose: true, debug: false, noColor: false });
 * ```
 */
export function setGlobalFlags(flags: Partial<GlobalFlags>): void {
	globalFlags = { ...globalFlags, ...flags };
}

/**
 * Get current global flags
 *
 * @returns Current global flags
 */
export function getGlobalFlags(): GlobalFlags {
	return { ...globalFlags };
}

/**
 * Check if colors should be used
 * Respects NO_COLOR environment variable and --no-color flag
 *
 * @param options - Log options that may override color setting
 * @returns true if colors should be used
 */
function shouldUseColors(options?: LogOptions): boolean {
	if (process.env.NO_COLOR) return false;
	if (globalFlags.noColor) return false;
	if (options?.colors === false) return false;
	return true;
}

/**
 * Check if output should be shown based on verbose/debug flags
 *
 * @param options - Log options with verbose/debug flags
 * @returns true if output should be shown
 */
function shouldShowOutput(options?: LogOptions): boolean {
	if (options?.debug && !globalFlags.debug) return false;
	if (options?.verbose && !globalFlags.verbose && !globalFlags.debug) return false;
	return true;
}

/**
 * Start an animated spinner
 * Only shows spinner if stdout is a TTY
 *
 * @param text - Initial spinner text
 * @param options - Spinner configuration options
 * @returns Ora spinner instance
 *
 * @example
 * ```typescript
 * const spinner = startSpinner('Loading data...');
 * // ... async operation ...
 * succeedSpinner(spinner, 'Data loaded!');
 * ```
 */
export function startSpinner(text: string, options: SpinnerOptions = {}): Ora {
	const useColors = shouldUseColors();
	const inTestEnv = isTestEnvironment();

	const spinner = ora({
		text,
		color: (options.color as any) || 'cyan',
		spinner: (options.spinner as any) || 'dots',
		stream: options.stream || process.stdout,
		// Disable spinner if not a TTY, colors disabled, or in test environment
		isEnabled: process.stdout.isTTY && useColors && !inTestEnv
	});

	// Only start spinner if not in test environment
	if (!inTestEnv) {
		spinner.start();
	}

	return spinner;
}

/**
 * Update spinner text while it's running
 *
 * @param spinner - Ora spinner instance
 * @param text - New text to display
 *
 * @example
 * ```typescript
 * const spinner = startSpinner('Step 1...');
 * await doStep1();
 * updateSpinner(spinner, 'Step 2...');
 * await doStep2();
 * succeedSpinner(spinner, 'All steps complete!');
 * ```
 */
export function updateSpinner(spinner: Ora, text: string): void {
	spinner.text = text;
}

/**
 * Stop spinner with success state (green checkmark)
 *
 * @param spinner - Ora spinner instance
 * @param text - Optional success message (uses current text if not provided)
 *
 * @example
 * ```typescript
 * const spinner = startSpinner('Fetching data...');
 * const data = await fetchData();
 * succeedSpinner(spinner, `Fetched ${data.length} items`);
 * ```
 */
export function succeedSpinner(spinner: Ora, text?: string): void {
	// Skip spinner output in test environment
	if (isTestEnvironment()) {
		spinner.stop();
		return;
	}

	if (text) {
		spinner.succeed(text);
	} else {
		spinner.succeed();
	}
}

/**
 * Stop spinner with failure state (red X)
 * Optionally displays error message
 *
 * @param spinner - Ora spinner instance
 * @param text - Optional failure message
 * @param error - Optional error object to display
 *
 * @example
 * ```typescript
 * const spinner = startSpinner('Saving data...');
 * try {
 *   await saveData();
 *   succeedSpinner(spinner);
 * } catch (error) {
 *   failSpinner(spinner, 'Failed to save data', error);
 * }
 * ```
 */
export function failSpinner(spinner: Ora, text?: string, error?: Error): void {
	// Skip spinner output in test environment
	if (isTestEnvironment()) {
		spinner.stop();
		return;
	}

	if (text) {
		spinner.fail(text);
	} else {
		spinner.fail();
	}

	// Show error details if provided and debug mode enabled
	if (error && globalFlags.debug) {
		console.error(chalk.gray(error.stack || error.message));
	}
}

/**
 * Stop spinner with warning state (yellow warning icon)
 *
 * @param spinner - Ora spinner instance
 * @param text - Warning message
 *
 * @example
 * ```typescript
 * const spinner = startSpinner('Processing items...');
 * const results = await processItems();
 * if (results.warnings.length > 0) {
 *   warnSpinner(spinner, `Completed with ${results.warnings.length} warnings`);
 * } else {
 *   succeedSpinner(spinner, 'All items processed successfully');
 * }
 * ```
 */
export function warnSpinner(spinner: Ora, text: string): void {
	// Skip spinner output in test environment
	if (isTestEnvironment()) {
		spinner.stop();
		return;
	}

	spinner.warn(text);
}

/**
 * Display an info message (cyan info icon)
 *
 * @param message - Info message to display
 * @param options - Log options
 *
 * @example
 * ```typescript
 * logInfo('Starting batch operation...');
 * logInfo('Processing 100 items in chunks of 10');
 * ```
 */
export function logInfo(message: string, options?: LogOptions): void {
	if (!shouldShowOutput(options)) return;

	const useColors = shouldUseColors(options);
	const icon = useColors ? chalk.cyan('ℹ') : 'ℹ';
	console.log(`${icon} ${message}`);
}

/**
 * Display a success message (green checkmark)
 *
 * @param message - Success message to display
 * @param options - Log options
 *
 * @example
 * ```typescript
 * logSuccess('Configuration saved successfully');
 * logSuccess(`Created ${count} connectors`);
 * ```
 */
export function logSuccess(message: string, options?: LogOptions): void {
	if (!shouldShowOutput(options)) return;

	const useColors = shouldUseColors(options);
	const icon = useColors ? chalk.green('✔') : '✔';
	console.log(`${icon} ${message}`);
}

/**
 * Display a warning message (yellow warning icon)
 *
 * @param message - Warning message to display
 * @param options - Log options
 *
 * @example
 * ```typescript
 * logWarning('Some items were skipped due to validation errors');
 * logWarning('API rate limit approaching, consider adding delays');
 * ```
 */
export function logWarning(message: string, options?: LogOptions): void {
	if (!shouldShowOutput(options)) return;

	const useColors = shouldUseColors(options);
	const icon = useColors ? chalk.yellow('⚠') : '⚠';
	console.log(`${icon} ${message}`);
}

/**
 * Display an error message (red X)
 * Optionally displays error details in debug mode
 *
 * @param message - Error message to display
 * @param error - Optional error object
 * @param options - Log options
 *
 * @example
 * ```typescript
 * try {
 *   await dangerousOperation();
 * } catch (error) {
 *   logError('Operation failed', error);
 *   process.exit(1);
 * }
 * ```
 */
export function logError(message: string, error?: Error, options?: LogOptions): void {
	if (!shouldShowOutput(options)) return;

	const useColors = shouldUseColors(options);
	const icon = useColors ? chalk.red('✖') : '✖';
	console.error(`${icon} ${message}`);

	if (error) {
		// Use formatError to get proper formatting for custom error types
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { formatError } = require('./errors.ts');
		const formattedError = formatError(error);

		// Display formatted error (includes field, errors array, suggestion for ValidationError)
		if (formattedError !== `Error: ${error.message}`) {
			// Custom error with enhanced formatting
			console.error(chalk.yellow(formattedError));
		} else {
			// Standard error - always show the message
			console.error(chalk.yellow(error.message));
			// Show stack trace in debug mode
			if (globalFlags.debug) {
				console.error(chalk.gray(error.stack || ''));
			}
		}
	}
}

/**
 * Display a debug message (gray, only shown in debug mode)
 *
 * @param message - Debug message to display
 * @param options - Log options (debug: true is implied)
 *
 * @example
 * ```typescript
 * logDebug('Raw API response:');
 * logDebug(JSON.stringify(response, null, 2));
 * ```
 */
export function logDebug(message: string, options?: LogOptions): void {
	const debugOptions: LogOptions = { ...options, debug: true };
	if (!shouldShowOutput(debugOptions)) return;

	const useColors = shouldUseColors(options);
	const formatted = useColors ? chalk.gray(`[DEBUG] ${message}`) : `[DEBUG] ${message}`;
	console.log(formatted);
}

/**
 * Progress tracker for bulk operations with progress bar
 * Shows current progress, percentage, and estimated time remaining
 *
 * @example
 * ```typescript
 * const progress = new ProgressTracker(100, 'Processing items');
 * for (let i = 0; i < 100; i++) {
 *   await processItem(i);
 *   progress.increment();
 * }
 * progress.finish();
 * ```
 */
export class ProgressTracker {
	private current: number = 0;
	private total: number;
	private label: string;
	private startTime: number;
	private lastUpdateTime: number = 0;
	private updateThrottle: number = 100; // ms between updates
	private barWidth: number = 30;

	/**
	 * Create a new progress tracker
	 *
	 * @param total - Total number of items to process
	 * @param label - Label for the progress bar (default: 'Progress')
	 *
	 * @example
	 * ```typescript
	 * const progress = new ProgressTracker(50, 'Uploading files');
	 * ```
	 */
	constructor(total: number, label: string = 'Progress') {
		this.total = total;
		this.label = label;
		this.startTime = Date.now();
		this.render();
	}

	/**
	 * Increment progress by specified amount
	 *
	 * @param amount - Amount to increment (default: 1)
	 *
	 * @example
	 * ```typescript
	 * progress.increment();     // Increment by 1
	 * progress.increment(5);    // Increment by 5
	 * ```
	 */
	increment(amount: number = 1): void {
		this.current = Math.min(this.current + amount, this.total);
		this.throttledRender();
	}

	/**
	 * Set total number of items
	 * Useful when total is not known upfront
	 *
	 * @param total - New total
	 *
	 * @example
	 * ```typescript
	 * const progress = new ProgressTracker(0, 'Loading items');
	 * const items = await loadItems();
	 * progress.setTotal(items.length);
	 * ```
	 */
	setTotal(total: number): void {
		this.total = total;
		this.render();
	}

	/**
	 * Set current progress value
	 *
	 * @param current - New current value
	 *
	 * @example
	 * ```typescript
	 * progress.setCurrent(25);  // Set progress to 25
	 * ```
	 */
	setCurrent(current: number): void {
		this.current = Math.min(current, this.total);
		this.throttledRender();
	}

	/**
	 * Finish progress tracking with success
	 *
	 * @param success - Whether operation was successful (default: true)
	 *
	 * @example
	 * ```typescript
	 * progress.finish();        // Success
	 * progress.finish(false);   // Failure
	 * ```
	 */
	finish(success: boolean = true): void {
		this.current = this.total;
		this.clearLine();

		const duration = formatDuration(this.startTime);
		const icon = success ? chalk.green('✔') : chalk.red('✖');
		const status = success ? 'completed' : 'failed';

		console.log(`${icon} ${this.label} ${status} (${this.total} items in ${duration})`);
	}

	/**
	 * Fail progress tracking with error
	 *
	 * @param error - Optional error object
	 *
	 * @example
	 * ```typescript
	 * try {
	 *   // ... bulk operation ...
	 *   progress.finish();
	 * } catch (error) {
	 *   progress.fail(error);
	 * }
	 * ```
	 */
	fail(error?: Error): void {
		this.clearLine();

		const duration = formatDuration(this.startTime);
		console.log(
			`${chalk.red('✖')} ${this.label} failed (${this.current}/${this.total} completed in ${duration})`
		);

		if (error && globalFlags.debug) {
			console.error(chalk.gray(error.stack || error.message));
		}
	}

	/**
	 * Render progress bar (throttled to avoid excessive updates)
	 */
	private throttledRender(): void {
		const now = Date.now();
		if (now - this.lastUpdateTime >= this.updateThrottle) {
			this.render();
			this.lastUpdateTime = now;
		}
	}

	/**
	 * Render the progress bar
	 */
	private render(): void {
		if (!process.stdout.isTTY) {
			// For non-TTY, just log percentage milestones
			const percent = Math.floor((this.current / this.total) * 100);
			if (percent % 10 === 0 && this.current > 0) {
				console.log(`${this.label}: ${percent}% (${this.current}/${this.total})`);
			}
			return;
		}

		const percent = this.total > 0 ? (this.current / this.total) * 100 : 0;
		const filledWidth = Math.round((this.barWidth * this.current) / this.total);
		const emptyWidth = this.barWidth - filledWidth;

		const bar = chalk.cyan('█'.repeat(filledWidth)) + '░'.repeat(emptyWidth);
		const percentage = `${percent.toFixed(1)}%`;
		const count = `${this.current}/${this.total}`;

		// Calculate ETA
		const elapsed = Date.now() - this.startTime;
		const rate = this.current / (elapsed / 1000); // items per second
		const remaining = this.total - this.current;
		const eta = rate > 0 ? remaining / rate : 0;
		const etaStr = eta > 0 ? ` ETA: ${formatDuration(Date.now() - eta * 1000)}` : '';

		this.clearLine();
		process.stdout.write(`${this.label}: [${bar}] ${percentage} ${count}${etaStr}`);
	}

	/**
	 * Clear current line for re-rendering
	 */
	private clearLine(): void {
		if (process.stdout.isTTY) {
			process.stdout.clearLine(0);
			process.stdout.cursorTo(0);
		}
	}
}

/**
 * Warn about potentially large token usage
 * Suggests optimization flags to reduce response size
 *
 * @param responseSize - Size of response in bytes/characters
 * @param threshold - Warning threshold in bytes (default: 50000)
 * @param suggestions - Array of suggestion strings to display
 *
 * @example
 * ```typescript
 * const response = await client.connectors.list();
 * const size = JSON.stringify(response).length;
 * warnTokenUsage(size, 50000, [
 *   'Use --count flag to get count only',
 *   'Use --fields to limit returned fields',
 *   'Use --limit to reduce number of items'
 * ]);
 * ```
 */
export function warnTokenUsage(
	responseSize: number,
	threshold: number = 50000,
	suggestions?: string[]
): void {
	if (responseSize < threshold) return;

	// Estimate token count (rough approximation: 1 token ≈ 4 characters)
	const estimatedTokens = Math.round(responseSize * 0.25);

	// Determine warning level
	const isHighUsage = responseSize > 100000;
	const icon = isHighUsage ? chalk.red('⚠') : chalk.yellow('⚠');
	const level = isHighUsage ? 'HIGH' : 'MODERATE';

	console.log();
	console.log(`${icon} ${level} TOKEN USAGE WARNING`);
	console.log(chalk.gray(`   Response size: ${formatBytes(responseSize)}`));
	console.log(chalk.gray(`   Estimated tokens: ~${estimatedTokens.toLocaleString()}`));

	if (suggestions && suggestions.length > 0) {
		console.log();
		console.log(chalk.cyan('   Suggestions to reduce token usage:'));
		suggestions.forEach((suggestion) => {
			console.log(chalk.gray(`   • ${suggestion}`));
		});
	}
	console.log();
}

/**
 * Start a timer for duration tracking
 * Returns timestamp that can be passed to formatDuration()
 *
 * @returns Start timestamp in milliseconds
 *
 * @example
 * ```typescript
 * const startTime = startTimer();
 * await longRunningOperation();
 * logSuccess(`Operation completed in ${formatDuration(startTime)}`);
 * ```
 */
export function startTimer(): number {
	return Date.now();
}

/**
 * Format duration from start time to now
 * Formats as human-readable string (ms, s, m:s)
 *
 * @param startTime - Start timestamp from startTimer()
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * const start = startTimer();
 * // ... operation ...
 * console.log(`Took ${formatDuration(start)}`);
 * // Output: "Took 2.5s" or "Took 1m 30s"
 * ```
 */
export function formatDuration(startTime: number): string {
	const elapsed = Date.now() - startTime;

	// Less than 1 second: show milliseconds
	if (elapsed < 1000) {
		return `${elapsed}ms`;
	}

	// Less than 60 seconds: show seconds with decimal
	if (elapsed < 60000) {
		return `${(elapsed / 1000).toFixed(1)}s`;
	}

	// 60 seconds or more: show minutes and seconds
	const minutes = Math.floor(elapsed / 60000);
	const seconds = Math.floor((elapsed % 60000) / 1000);
	return `${minutes}m ${seconds}s`;
}

/**
 * Format bytes as human-readable string
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 KB", "2.3 MB")
 */
function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	} else if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	} else {
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
}

/**
 * Create a divider line for visual separation
 *
 * @param char - Character to use for divider (default: '─')
 * @param width - Width of divider (default: 60)
 * @returns Divider string
 *
 * @example
 * ```typescript
 * console.log(divider());
 * console.log('Section content');
 * console.log(divider('='));
 * ```
 */
export function divider(char: string = '─', width: number = 60): string {
	return chalk.gray(char.repeat(width));
}

/**
 * Create a section header with dividers
 *
 * @param title - Section title
 * @returns Formatted section header
 *
 * @example
 * ```typescript
 * console.log(sectionHeader('Project Configuration'));
 * // Output:
 * // ────────────────────────────────────────────────────────────
 * //  Project Configuration
 * // ────────────────────────────────────────────────────────────
 * ```
 */
export function sectionHeader(title: string): string {
	const div = divider();
	return `\n${div}\n ${chalk.bold(title)}\n${div}`;
}

/**
 * Utility type exports for external use
 */
export type { Ora };
