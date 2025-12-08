/**
 * DocsClient Unit Tests
 *
 * Tests GitHub documentation fetching functionality
 */

import { describe, test, expect } from 'bun:test';
import { DocsClient } from '../../src/client/docs';

describe('DocsClient', () => {
	const client = new DocsClient();

	test('should list documentation files', async () => {
		const docs = await client.listDocs();

		// Verify we get an array
		expect(Array.isArray(docs)).toBe(true);

		// Verify we have docs
		expect(docs.length).toBeGreaterThan(0);

		// Verify names don't have .md extension
		docs.forEach(doc => {
			expect(doc.endsWith('.md')).toBe(false);
		});

		// Verify expected docs exist
		expect(docs).toContain('quickstart');
		expect(docs).toContain('automations-quickstart');
		expect(docs).toContain('pipelines-quickstart');
	}, 10000); // 10s timeout for network request

	test('should fetch a specific documentation file', async () => {
		const content = await client.getDoc('quickstart');

		// Verify we got content
		expect(content).toBeTruthy();
		expect(typeof content).toBe('string');

		// Verify it's markdown content
		expect(content).toContain('#');
		expect(content.length).toBeGreaterThan(100);
	}, 10000);

	test('should handle .md extension in doc name', async () => {
		// With extension
		const content1 = await client.getDoc('quickstart.md');

		// Without extension
		const content2 = await client.getDoc('quickstart');

		// Should get the same content
		expect(content1).toBe(content2);
	}, 10000);

	test('should check if doc exists', async () => {
		const exists = await client.docExists('quickstart');
		expect(exists).toBe(true);

		const notExists = await client.docExists('this-doc-does-not-exist');
		expect(notExists).toBe(false);
	}, 10000);

	test('should throw error for non-existent doc', async () => {
		expect(async () => {
			await client.getDoc('this-doc-does-not-exist');
		}).toThrow();
	}, 10000);
});
