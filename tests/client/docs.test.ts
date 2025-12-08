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

	test('should get default docs directory', () => {
		const dir = client.getDefaultDocsDir();
		expect(dir).toBeTruthy();
		expect(dir).toContain('.databasin');
		expect(dir).toContain('docs');
	});

	test('should download and cache documentation', async () => {
		const testDir = '/tmp/databasin-docs-test-' + Date.now();

		// Download docs
		const count = await client.downloadAllDocs(testDir);

		// Verify count
		expect(count).toBeGreaterThan(0);

		// Verify local docs exist
		expect(client.hasLocalDocs(testDir)).toBe(true);

		// Verify can list local docs
		const localDocs = client.listLocalDocs(testDir);
		expect(localDocs.length).toBe(count);

		// Verify can read from cache
		const localContent = client.getLocalDoc('quickstart', testDir);
		expect(localContent).toBeTruthy();
		expect(localContent).toContain('#');

		// Clean up
		const fs = require('fs');
		fs.rmSync(testDir, { recursive: true, force: true });
	}, 30000);

	test('should use cache with getDocWithCache', async () => {
		const { content, source } = await client.getDocWithCache('quickstart');

		// Verify we got content
		expect(content).toBeTruthy();
		expect(content).toContain('#');

		// Source could be either 'local' or 'github' depending on whether
		// docs have been downloaded to ~/.databasin/docs
		expect(['local', 'github']).toContain(source);
	}, 30000);
});
