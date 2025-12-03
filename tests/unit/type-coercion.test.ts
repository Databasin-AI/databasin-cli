/**
 * Unit Tests for Type Coercion Utilities
 *
 * Tests all type coercion functions to ensure exact parity with frontend behavior.
 * Based on frontend parseBool implementation and artifact enrichment logic.
 *
 * @see src/utils/type-coercion.ts
 */

import { describe, test, expect } from 'bun:test';
import { parseBool, parseIntSafe, ensureString } from '../../src/utils/type-coercion.ts';

describe('parseBool', () => {
	describe('boolean inputs', () => {
		test('should return true for boolean true', () => {
			expect(parseBool(true)).toBe(true);
		});

		test('should return false for boolean false', () => {
			expect(parseBool(false)).toBe(false);
		});
	});

	describe('string inputs', () => {
		test('should return true for "true"', () => {
			expect(parseBool('true')).toBe(true);
		});

		test('should return true for "TRUE" (case-insensitive)', () => {
			expect(parseBool('TRUE')).toBe(true);
		});

		test('should return true for "True" (mixed case)', () => {
			expect(parseBool('True')).toBe(true);
		});

		test('should return true for "t"', () => {
			expect(parseBool('t')).toBe(true);
		});

		test('should return true for "T"', () => {
			expect(parseBool('T')).toBe(true);
		});

		test('should return true for "on"', () => {
			expect(parseBool('on')).toBe(true);
		});

		test('should return true for "ON"', () => {
			expect(parseBool('ON')).toBe(true);
		});

		test('should return true for "1"', () => {
			expect(parseBool('1')).toBe(true);
		});

		test('should return false for "false"', () => {
			expect(parseBool('false')).toBe(false);
		});

		test('should return false for "FALSE"', () => {
			expect(parseBool('FALSE')).toBe(false);
		});

		test('should return false for "f"', () => {
			expect(parseBool('f')).toBe(false);
		});

		test('should return false for "off"', () => {
			expect(parseBool('off')).toBe(false);
		});

		test('should return false for "0"', () => {
			expect(parseBool('0')).toBe(false);
		});

		test('should return false for empty string', () => {
			expect(parseBool('')).toBe(false);
		});

		test('should return false for random string', () => {
			expect(parseBool('random')).toBe(false);
		});
	});

	describe('number inputs', () => {
		test('should return true for number 1', () => {
			expect(parseBool(1)).toBe(true);
		});

		test('should return false for number 0', () => {
			expect(parseBool(0)).toBe(false);
		});

		test('should return false for number 2', () => {
			expect(parseBool(2)).toBe(false);
		});

		test('should return false for number -1', () => {
			expect(parseBool(-1)).toBe(false);
		});

		test('should return false for NaN', () => {
			expect(parseBool(NaN)).toBe(false);
		});
	});

	describe('null/undefined inputs', () => {
		test('should return false for null', () => {
			expect(parseBool(null)).toBe(false);
		});

		test('should return false for undefined', () => {
			expect(parseBool(undefined)).toBe(false);
		});
	});

	describe('other types', () => {
		test('should return false for object', () => {
			expect(parseBool({})).toBe(false);
		});

		test('should return false for array', () => {
			expect(parseBool([])).toBe(false);
		});
	});
});

describe('parseIntSafe', () => {
	describe('number inputs', () => {
		test('should return number as-is for integers', () => {
			expect(parseIntSafe(42, 0)).toBe(42);
		});

		test('should floor decimal numbers', () => {
			expect(parseIntSafe(42.7, 0)).toBe(42);
		});

		test('should floor negative decimals', () => {
			expect(parseIntSafe(-42.7, 0)).toBe(-43);
		});

		test('should return default for NaN', () => {
			expect(parseIntSafe(NaN, 10)).toBe(10);
		});

		test('should handle zero', () => {
			expect(parseIntSafe(0, 10)).toBe(0);
		});

		test('should handle negative numbers', () => {
			expect(parseIntSafe(-100, 0)).toBe(-100);
		});
	});

	describe('string inputs', () => {
		test('should parse valid integer strings', () => {
			expect(parseIntSafe('42', 0)).toBe(42);
		});

		test('should parse negative integer strings', () => {
			expect(parseIntSafe('-42', 0)).toBe(-42);
		});

		test('should parse decimal strings (floors value)', () => {
			expect(parseIntSafe('42.7', 0)).toBe(42);
		});

		test('should handle strings with whitespace', () => {
			expect(parseIntSafe('  42  ', 0)).toBe(42);
		});

		test('should return default for empty string', () => {
			expect(parseIntSafe('', 10)).toBe(10);
		});

		test('should return default for whitespace-only string', () => {
			expect(parseIntSafe('   ', 10)).toBe(10);
		});

		test('should return default for invalid strings', () => {
			expect(parseIntSafe('invalid', 10)).toBe(10);
		});

		test('should return default for mixed content strings', () => {
			expect(parseIntSafe('42abc', 0)).toBe(42); // parseInt stops at first non-digit
		});
	});

	describe('null/undefined inputs', () => {
		test('should return default for null', () => {
			expect(parseIntSafe(null, 10)).toBe(10);
		});

		test('should return default for undefined', () => {
			expect(parseIntSafe(undefined, 10)).toBe(10);
		});
	});

	describe('default value behavior', () => {
		test('should use custom default value', () => {
			expect(parseIntSafe(null, 999)).toBe(999);
		});

		test('should use zero as default when specified', () => {
			expect(parseIntSafe(undefined, 0)).toBe(0);
		});

		test('should use negative default when specified', () => {
			expect(parseIntSafe(null, -1)).toBe(-1);
		});
	});

	describe('other types', () => {
		test('should return default for objects', () => {
			expect(parseIntSafe({}, 10)).toBe(10);
		});

		test('should return default for arrays', () => {
			expect(parseIntSafe([], 10)).toBe(10);
		});
	});
});

describe('ensureString', () => {
	describe('string inputs', () => {
		test('should return string as-is', () => {
			expect(ensureString('hello')).toBe('hello');
		});

		test('should return empty string as-is', () => {
			expect(ensureString('')).toBe('');
		});

		test('should return string with whitespace as-is', () => {
			expect(ensureString('  hello  ')).toBe('  hello  ');
		});
	});

	describe('number inputs', () => {
		test('should convert integers to strings', () => {
			expect(ensureString(42)).toBe('42');
		});

		test('should convert decimals to strings', () => {
			expect(ensureString(42.7)).toBe('42.7');
		});

		test('should convert zero to string', () => {
			expect(ensureString(0)).toBe('0');
		});

		test('should convert negative numbers to strings', () => {
			expect(ensureString(-42)).toBe('-42');
		});
	});

	describe('null/undefined inputs', () => {
		test('should return empty string for null (no default)', () => {
			expect(ensureString(null)).toBe('');
		});

		test('should return empty string for undefined (no default)', () => {
			expect(ensureString(undefined)).toBe('');
		});

		test('should return default for null when specified', () => {
			expect(ensureString(null, 'default')).toBe('default');
		});

		test('should return default for undefined when specified', () => {
			expect(ensureString(undefined, 'default')).toBe('default');
		});
	});

	describe('default value behavior', () => {
		test('should use custom default for null', () => {
			expect(ensureString(null, 'custom')).toBe('custom');
		});

		test('should not use default for actual strings', () => {
			expect(ensureString('hello', 'default')).toBe('hello');
		});

		test('should not use default for numbers', () => {
			expect(ensureString(42, 'default')).toBe('42');
		});
	});

	describe('other types', () => {
		test('should return default for booleans', () => {
			expect(ensureString(true, 'default')).toBe('default');
		});

		test('should return default for objects', () => {
			expect(ensureString({}, 'default')).toBe('default');
		});

		test('should return default for arrays', () => {
			expect(ensureString([], 'default')).toBe('default');
		});

		test('should return empty string for booleans when no default', () => {
			expect(ensureString(true)).toBe('');
		});
	});
});
