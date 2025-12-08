/**
 * String Similarity Utilities
 *
 * Provides string matching algorithms for command suggestions and fuzzy search.
 * Uses Levenshtein distance for measuring string similarity.
 *
 * @module utils/string-similarity
 */

/**
 * Calculate Levenshtein distance between two strings
 *
 * Levenshtein distance measures the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string into another.
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns The Levenshtein distance (lower is more similar)
 *
 * @example
 * ```typescript
 * levenshteinDistance('connector', 'connectors') // 1
 * levenshteinDistance('pipeline', 'pipe') // 4
 * ```
 */
export function levenshteinDistance(str1: string, str2: string): number {
	const len1 = str1.length;
	const len2 = str2.length;

	// Create 2D array for dynamic programming
	const matrix: number[][] = Array(len1 + 1)
		.fill(null)
		.map(() => Array(len2 + 1).fill(0));

	// Initialize first column (deletion cost)
	for (let i = 0; i <= len1; i++) {
		matrix[i][0] = i;
	}

	// Initialize first row (insertion cost)
	for (let j = 0; j <= len2; j++) {
		matrix[0][j] = j;
	}

	// Fill in the rest of the matrix
	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1, // deletion
				matrix[i][j - 1] + 1, // insertion
				matrix[i - 1][j - 1] + cost // substitution
			);
		}
	}

	return matrix[len1][len2];
}

/**
 * Calculate normalized similarity between two strings (0-1 scale)
 *
 * Returns a score between 0 (completely different) and 1 (identical).
 * Normalizes the Levenshtein distance by the length of the longer string.
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score (0 = no match, 1 = perfect match)
 *
 * @example
 * ```typescript
 * stringSimilarity('connector', 'connectors') // 0.9 (very similar)
 * stringSimilarity('pipeline', 'automation') // 0.1 (very different)
 * ```
 */
export function stringSimilarity(str1: string, str2: string): number {
	const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
	const maxLen = Math.max(str1.length, str2.length);

	// Avoid division by zero
	if (maxLen === 0) {
		return 1;
	}

	return 1 - distance / maxLen;
}

/**
 * Find the most similar string from an array of candidates
 *
 * Returns the candidate with the highest similarity score to the input string.
 * If no candidates are provided or all have similarity < threshold, returns null.
 *
 * @param input - The input string to match
 * @param candidates - Array of candidate strings to compare against
 * @param threshold - Minimum similarity threshold (0-1), default 0.4
 * @returns The most similar candidate, or null if none meet the threshold
 *
 * @example
 * ```typescript
 * findMostSimilar('connector', ['connectors', 'pipelines', 'projects'])
 * // 'connectors' (similarity: 0.9)
 *
 * findMostSimilar('xyz', ['connectors', 'pipelines'], 0.5)
 * // null (no candidates meet 0.5 threshold)
 * ```
 */
export function findMostSimilar(
	input: string,
	candidates: string[],
	threshold: number = 0.4
): string | null {
	if (candidates.length === 0) {
		return null;
	}

	let bestMatch: string | null = null;
	let bestScore = threshold;

	for (const candidate of candidates) {
		const score = stringSimilarity(input, candidate);
		if (score > bestScore) {
			bestScore = score;
			bestMatch = candidate;
		}
	}

	return bestMatch;
}

/**
 * Find top N most similar strings from an array of candidates
 *
 * Returns up to N candidates ranked by similarity score.
 * Only returns candidates with similarity >= threshold.
 *
 * @param input - The input string to match
 * @param candidates - Array of candidate strings to compare against
 * @param options - Options for filtering and limiting results
 * @returns Array of candidates sorted by similarity (highest first)
 *
 * @example
 * ```typescript
 * findTopMatches('pipe', ['pipelines', 'pipeline', 'automation', 'connectors'], { limit: 3 })
 * // ['pipelines', 'pipeline'] (sorted by similarity)
 * ```
 */
export function findTopMatches(
	input: string,
	candidates: string[],
	options: {
		limit?: number;
		threshold?: number;
	} = {}
): Array<{ value: string; score: number }> {
	const { limit = 3, threshold = 0.4 } = options;

	// Calculate similarity scores for all candidates
	const scores = candidates
		.map((candidate) => ({
			value: candidate,
			score: stringSimilarity(input, candidate)
		}))
		.filter((item) => item.score >= threshold)
		.sort((a, b) => b.score - a.score) // Sort descending by score
		.slice(0, limit); // Limit results

	return scores;
}

/**
 * Check if a string fuzzy-matches a pattern
 *
 * Returns true if all characters in the pattern appear in the same order in the input,
 * but not necessarily consecutively. Case-insensitive.
 *
 * @param input - The string to check
 * @param pattern - The pattern to match
 * @returns True if pattern fuzzy-matches input
 *
 * @example
 * ```typescript
 * fuzzyMatch('connectors', 'con') // true
 * fuzzyMatch('connectors', 'cnr') // true
 * fuzzyMatch('connectors', 'crt') // false
 * ```
 */
export function fuzzyMatch(input: string, pattern: string): boolean {
	const inputLower = input.toLowerCase();
	const patternLower = pattern.toLowerCase();

	let patternIndex = 0;

	for (let i = 0; i < inputLower.length && patternIndex < patternLower.length; i++) {
		if (inputLower[i] === patternLower[patternIndex]) {
			patternIndex++;
		}
	}

	return patternIndex === patternLower.length;
}

/**
 * Filter array of strings using fuzzy matching
 *
 * Returns all strings that fuzzy-match the pattern.
 *
 * @param inputs - Array of strings to filter
 * @param pattern - The pattern to match
 * @returns Filtered array of strings that match the pattern
 *
 * @example
 * ```typescript
 * fuzzyFilter(['connectors', 'pipelines', 'automations'], 'con')
 * // ['connectors']
 *
 * fuzzyFilter(['connectors', 'pipelines', 'automations'], 'tion')
 * // ['automations']
 * ```
 */
export function fuzzyFilter(inputs: string[], pattern: string): string[] {
	return inputs.filter((input) => fuzzyMatch(input, pattern));
}
