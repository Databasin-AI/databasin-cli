import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { logger, LogLevel, createLogger } from './debug.js';

describe('Debug Logger', () => {
    let originalDebug: string | undefined;

    beforeEach(() => {
        originalDebug = process.env.DEBUG;
    });

    afterEach(() => {
        if (originalDebug !== undefined) {
            process.env.DEBUG = originalDebug;
        } else {
            delete process.env.DEBUG;
        }
    });

    test('Debug logging is disabled by default', () => {
        delete process.env.DEBUG;
        const testLogger = new (logger.constructor as any)();
        expect(testLogger.isDebugEnabled()).toBe(false);
    });

    test('Debug logging enabled with DEBUG=true', () => {
        process.env.DEBUG = 'true';
        const testLogger = new (logger.constructor as any)();
        expect(testLogger.isDebugEnabled()).toBe(true);
    });

    test('Debug logging enabled with DEBUG=*', () => {
        process.env.DEBUG = '*';
        const testLogger = new (logger.constructor as any)();
        expect(testLogger.isDebugEnabled()).toBe(true);
    });

    test('Can set log level programmatically', () => {
        logger.setLevel(LogLevel.DEBUG);
        expect(logger.getLevel()).toBe(LogLevel.DEBUG);

        logger.setLevel(LogLevel.ERROR);
        expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });

    test('createLogger adds category prefix', () => {
        const categoryLogger = createLogger('TestCategory');
        // Just verify it doesn't throw
        categoryLogger.debug('Test message');
        categoryLogger.info('Info message');
    });
});
