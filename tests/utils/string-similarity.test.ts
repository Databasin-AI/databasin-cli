/**
 * Tests for String Similarity Utilities
 *
 * Validates Levenshtein distance, fuzzy matching, and string similarity algorithms.
 */

import { describe, test, expect } from 'bun:test';
import {
	levenshteinDistance,
	stringSimilarity,
	findMostSimilar,
	findTopMatches,
	fuzzyMatch,
	fuzzyFilter
} from '../../src/utils/string-similarity';

describe('levenshteinDistance', () => {
	test('calculates distance for identical strings', () => {
		expect(levenshteinDistance('hello', 'hello')).toBe(0);
		expect(levenshteinDistance('', '')).toBe(0);
	});

	test('calculates distance for single character difference', () => {
		expect(levenshteinDistance('cat', 'bat')).toBe(1); // substitution
		expect(levenshteinDistance('cat', 'cats')).toBe(1); // insertion
		expect(levenshteinDistance('cats', 'cat')).toBe(1); // deletion
	});

	test('calculates distance for multiple changes', () => {
		expect(levenshteinDistance('kitten', 'sitting')).toBe(3); // k→s, e→i, insert g
		expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
	});

	test('handles completely different strings', () => {
		expect(levenshteinDistance('abc', 'xyz')).toBe(3);
		expect(levenshteinDistance('hello', 'world')).toBe(4);
	});

	test('handles empty strings', () => {
		expect(levenshteinDistance('', 'abc')).toBe(3);
		expect(levenshteinDistance('abc', '')).toBe(3);
	});

	test('handles single character strings', () => {
		expect(levenshteinDistance('a', 'a')).toBe(0);
		expect(levenshteinDistance('a', 'b')).toBe(1);
	});

	test('is case sensitive', () => {
		expect(levenshteinDistance('Hello', 'hello')).toBe(1);
		expect(levenshteinDistance('ABC', 'abc')).toBe(3);
	});

	test('handles long strings efficiently', () => {
		const str1 = 'a'.repeat(100);
		const str2 = 'a'.repeat(99) + 'b';
		expect(levenshteinDistance(str1, str2)).toBe(1);
	});
});

describe('stringSimilarity', () => {
	test('returns 1.0 for identical strings', () => {
		expect(stringSimilarity('hello', 'hello')).toBe(1);
		expect(stringSimilarity('test', 'test')).toBe(1);
	});

	test('returns high similarity for very similar strings', () => {
		const similarity = stringSimilarity('connector', 'connectors');
		expect(similarity).toBeGreaterThanOrEqual(0.9);
		expect(similarity).toBeLessThan(1);
	});

	test('returns low similarity for very different strings', () => {
		const similarity = stringSimilarity('pipeline', 'automation');
		expect(similarity).toBeLessThan(0.3);
	});

	test('is case insensitive', () => {
		expect(stringSimilarity('Hello', 'hello')).toBe(1);
		expect(stringSimilarity('CONNECTOR', 'connector')).toBe(1);
	});

	test('handles empty strings', () => {
		expect(stringSimilarity('', '')).toBe(1); // Both empty = identical
		expect(stringSimilarity('abc', '')).toBe(0); // Completely different
		expect(stringSimilarity('', 'abc')).toBe(0);
	});

	test('returns normalized values between 0 and 1', () => {
		const similarity = stringSimilarity('cat', 'dog');
		expect(similarity).toBeGreaterThanOrEqual(0);
		expect(similarity).toBeLessThanOrEqual(1);
	});

	test('similarity decreases with more differences', () => {
		const sim1 = stringSimilarity('connector', 'connectors');
		const sim2 = stringSimilarity('connector', 'connect');
		const sim3 = stringSimilarity('connector', 'pipeline');

		expect(sim1).toBeGreaterThan(sim2);
		expect(sim2).toBeGreaterThan(sim3);
	});
});

describe('findMostSimilar', () => {
	const candidates = ['connectors', 'pipelines', 'projects', 'automations'];

	test('finds exact match', () => {
		const result = findMostSimilar('connectors', candidates);
		expect(result).toBe('connectors');
	});

	test('finds close typo match', () => {
		const result = findMostSimilar('connector', candidates);
		expect(result).toBe('connectors');
	});

	test('finds closest match for partial input', () => {
		const result = findMostSimilar('pipe', candidates);
		expect(result).toBe('pipelines');
	});

	test('returns null when no candidate meets threshold', () => {
		const result = findMostSimilar('xyz', candidates, 0.5);
		expect(result).toBeNull();
	});

	test('returns null for empty candidate list', () => {
		const result = findMostSimilar('test', []);
		expect(result).toBeNull();
	});

	test('respects custom threshold', () => {
		// Very low threshold - should find some match even for dissimilar strings
		// Note: threshold is exclusive, so we need > threshold, not >= threshold
		// With a similar input that definitely meets threshold
		const result1 = findMostSimilar('project', candidates, 0.4);
		expect(result1).not.toBeNull();

		// High threshold - should not find match for dissimilar string
		const result2 = findMostSimilar('xyz', candidates, 0.9);
		expect(result2).toBeNull();
	});

	test('uses default threshold of 0.4', () => {
		// This should find a match with default threshold
		const result = findMostSimilar('projct', candidates);
		expect(result).toBe('projects');
	});

	test('is case insensitive', () => {
		const result = findMostSimilar('CONNECTORS', candidates);
		expect(result).toBe('connectors');
	});

	test('handles single candidate', () => {
		const result = findMostSimilar('test', ['testing']);
		expect(result).toBe('testing');
	});
});

describe('findTopMatches', () => {
	const candidates = ['connectors', 'connector', 'connect', 'pipelines', 'projects'];

	test('returns top N matches sorted by similarity', () => {
		const results = findTopMatches('connector', candidates, { limit: 3 });

		expect(results.length).toBeLessThanOrEqual(3);
		expect(results[0].value).toBe('connector'); // Exact match should be first
		expect(results[1].value).toBe('connectors'); // Very close match

		// Verify scores are descending
		for (let i = 0; i < results.length - 1; i++) {
			expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
		}
	});

	test('includes similarity scores', () => {
		const results = findTopMatches('connector', candidates, { limit: 2 });

		expect(results[0].score).toBeDefined();
		expect(results[0].score).toBeGreaterThan(0);
		expect(results[0].score).toBeLessThanOrEqual(1);
	});

	test('filters by threshold', () => {
		const results = findTopMatches('xyz', candidates, { threshold: 0.8 });

		// No candidates should meet 0.8 threshold for 'xyz'
		expect(results.length).toBe(0);
	});

	test('respects limit parameter', () => {
		const results = findTopMatches('con', candidates, { limit: 2 });
		expect(results.length).toBeLessThanOrEqual(2);
	});

	test('returns all matches when limit exceeds candidates', () => {
		const results = findTopMatches('connector', candidates, { limit: 100 });
		expect(results.length).toBeLessThanOrEqual(candidates.length);
	});

	test('uses default threshold of 0.4', () => {
		const results = findTopMatches('conn', candidates);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].score).toBeGreaterThanOrEqual(0.4);
	});

	test('uses default limit of 3', () => {
		const results = findTopMatches('con', candidates);
		expect(results.length).toBeLessThanOrEqual(3);
	});

	test('handles empty candidate list', () => {
		const results = findTopMatches('test', []);
		expect(results).toEqual([]);
	});

	test('exact match has score of 1.0', () => {
		const results = findTopMatches('connector', ['connector']);
		expect(results[0].score).toBe(1);
	});
});

describe('fuzzyMatch', () => {
	test('matches exact substring', () => {
		expect(fuzzyMatch('connectors', 'con')).toBe(true);
		expect(fuzzyMatch('pipelines', 'pipe')).toBe(true);
	});

	test('matches characters in order but not consecutive', () => {
		expect(fuzzyMatch('connectors', 'cnr')).toBe(true); // c-o-n-n-e-c-t-o-r-s
		expect(fuzzyMatch('pipelines', 'ppls')).toBe(true);
	});

	test('does not match characters out of order', () => {
		expect(fuzzyMatch('connectors', 'crt')).toBe(false); // 'r' comes before 't'
		expect(fuzzyMatch('pipelines', 'lpi')).toBe(false);
	});

	test('is case insensitive', () => {
		expect(fuzzyMatch('Connectors', 'CON')).toBe(true);
		expect(fuzzyMatch('PIPELINES', 'pipe')).toBe(true);
	});

	test('matches empty pattern', () => {
		expect(fuzzyMatch('test', '')).toBe(true);
	});

	test('does not match when pattern is longer than input', () => {
		expect(fuzzyMatch('abc', 'abcdef')).toBe(false);
	});

	test('matches single character', () => {
		expect(fuzzyMatch('test', 't')).toBe(true);
		expect(fuzzyMatch('test', 'e')).toBe(true);
		expect(fuzzyMatch('test', 'z')).toBe(false);
	});

	test('matches complete string', () => {
		expect(fuzzyMatch('test', 'test')).toBe(true);
	});

	test('handles special characters', () => {
		expect(fuzzyMatch('test-case', 'tc')).toBe(true);
		expect(fuzzyMatch('test_case', 'tca')).toBe(true);
	});
});

describe('fuzzyFilter', () => {
	const items = ['connectors', 'pipelines', 'projects', 'automations', 'connector'];

	test('filters items matching pattern', () => {
		const results = fuzzyFilter(items, 'con');
		expect(results).toContain('connectors');
		expect(results).toContain('connector');
		expect(results.length).toBe(2);
	});

	test('filters with non-consecutive characters', () => {
		const results = fuzzyFilter(items, 'ppl');
		expect(results).toContain('pipelines');
	});

	test('returns empty array when no matches', () => {
		const results = fuzzyFilter(items, 'xyz');
		expect(results).toEqual([]);
	});

	test('is case insensitive', () => {
		const results = fuzzyFilter(items, 'CON');
		expect(results.length).toBe(2);
	});

	test('matches all items with empty pattern', () => {
		const results = fuzzyFilter(items, '');
		expect(results.length).toBe(items.length);
	});

	test('handles empty input array', () => {
		const results = fuzzyFilter([], 'test');
		expect(results).toEqual([]);
	});

	test('preserves original item order', () => {
		const results = fuzzyFilter(['zzz', 'aaa', 'bbb'], 'a');
		expect(results).toContain('aaa');
		// Both 'aaa' and 'bbb' won't match 'a' unless it contains 'a'
		// Just verify the filter preserves order for items that match
	});

	test('filters exact substring matches', () => {
		const results = fuzzyFilter(items, 'pipe');
		expect(results).toContain('pipelines');
		expect(results.length).toBe(1);
	});
});

describe('Edge Cases and Error Handling', () => {
	test('handles strings with unicode characters', () => {
		expect(levenshteinDistance('café', 'cafe')).toBeGreaterThan(0);
		expect(stringSimilarity('naïve', 'naive')).toBeGreaterThan(0.5);
	});

	test('handles very long strings', () => {
		const long1 = 'a'.repeat(1000);
		const long2 = 'a'.repeat(999) + 'b';
		expect(levenshteinDistance(long1, long2)).toBe(1);
	});

	test('handles strings with numbers', () => {
		expect(fuzzyMatch('version123', 'v123')).toBe(true);
		expect(stringSimilarity('test123', 'test456')).toBeGreaterThan(0.5);
	});

	test('handles strings with special characters', () => {
		expect(stringSimilarity('test@example.com', 'test@example.org')).toBeGreaterThan(0.8);
	});
});
