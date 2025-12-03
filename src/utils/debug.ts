import chalk from 'chalk';

/**
 * Log level enumeration
 */
export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}

/**
 * Simple debug logger that respects DEBUG environment variable
 *
 * @example
 * ```typescript
 * import { logger } from './utils/debug.js';
 *
 * logger.debug('API call details', { endpoint: '/api/v2/...' });
 * logger.error('Operation failed', error);
 * ```
 */
class Logger {
    private level: LogLevel;

    constructor() {
        // Check DEBUG environment variable
        const debugEnv = process.env.DEBUG;

        if (debugEnv === 'true' || debugEnv === '1' || debugEnv === '*') {
            this.level = LogLevel.DEBUG;
        } else if (debugEnv === 'info') {
            this.level = LogLevel.INFO;
        } else if (debugEnv === 'warn') {
            this.level = LogLevel.WARN;
        } else {
            // Production: only show errors
            this.level = LogLevel.ERROR;
        }
    }

    /**
     * Set the log level programmatically
     *
     * @param level Log level to set
     */
    setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Get current log level
     */
    getLevel(): LogLevel {
        return this.level;
    }

    /**
     * Check if debug logging is enabled
     */
    isDebugEnabled(): boolean {
        return this.level >= LogLevel.DEBUG;
    }

    /**
     * Log error message (always shown)
     *
     * @param message Error message
     * @param args Additional arguments to log
     */
    error(message: string, ...args: any[]): void {
        if (this.level >= LogLevel.ERROR) {
            console.error(chalk.red(`[ERROR] ${message}`), ...args);
        }
    }

    /**
     * Log warning message
     *
     * @param message Warning message
     * @param args Additional arguments to log
     */
    warn(message: string, ...args: any[]): void {
        if (this.level >= LogLevel.WARN) {
            console.warn(chalk.yellow(`[WARN] ${message}`), ...args);
        }
    }

    /**
     * Log info message
     *
     * @param message Info message
     * @param args Additional arguments to log
     */
    info(message: string, ...args: any[]): void {
        if (this.level >= LogLevel.INFO) {
            console.log(chalk.white(message), ...args);
        }
    }

    /**
     * Log debug message (only when DEBUG is set)
     *
     * @param message Debug message
     * @param args Additional arguments to log
     */
    debug(message: string, ...args: any[]): void {
        if (this.level >= LogLevel.DEBUG) {
            // Use stderr for debug output (like before)
            console.error(chalk.dim(`[DEBUG] ${message}`), ...args);
        }
    }

    /**
     * Log debug message with a prefix/category
     *
     * Useful for grouping related debug messages.
     *
     * @param category Category/prefix for the message
     * @param message Debug message
     * @param args Additional arguments to log
     *
     * @example
     * ```typescript
     * logger.debugCat('SQL', 'Fetching catalogs', { connectorId: 123 });
     * // Output: [DEBUG] [SQL] Fetching catalogs { connectorId: 123 }
     * ```
     */
    debugCat(category: string, message: string, ...args: any[]): void {
        if (this.level >= LogLevel.DEBUG) {
            console.error(chalk.dim(`[DEBUG] [${category}] ${message}`), ...args);
        }
    }
}

/**
 * Global logger instance
 *
 * Use this throughout the application for consistent logging.
 */
export const logger = new Logger();

/**
 * Create a logger with a specific category prefix
 *
 * Useful for module-specific logging.
 *
 * @param category Category name
 * @returns Object with logging methods that include category
 *
 * @example
 * ```typescript
 * const log = createLogger('ConfigClient');
 * log.debug('Fetching configuration'); // [DEBUG] [ConfigClient] Fetching configuration
 * ```
 */
export function createLogger(category: string) {
    return {
        error: (message: string, ...args: any[]) =>
            logger.error(`[${category}] ${message}`, ...args),
        warn: (message: string, ...args: any[]) =>
            logger.warn(`[${category}] ${message}`, ...args),
        info: (message: string, ...args: any[]) =>
            logger.info(`[${category}] ${message}`, ...args),
        debug: (message: string, ...args: any[]) =>
            logger.debugCat(category, message, ...args)
    };
}
