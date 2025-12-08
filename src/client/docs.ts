/**
 * GitHub Docs API Client
 *
 * Fetches documentation files from the Databasin CLI GitHub repository.
 * Provides:
 * - List all markdown docs in the /docs folder
 * - Fetch raw content of specific docs
 * - Direct GitHub API integration (no auth required for public repos)
 *
 * @module client/docs
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CliConfig } from '../types/config.ts';
import { logger } from '../utils/debug.ts';

/**
 * GitHub API response for directory contents
 */
export interface GitHubFile {
	name: string;
	path: string;
	type: 'file' | 'dir';
	download_url: string | null;
	html_url: string;
}

/**
 * Docs client for fetching documentation from GitHub
 *
 * Interacts directly with GitHub API to fetch docs from the public repository.
 * Does not require authentication for public repositories.
 *
 * @example
 * ```typescript
 * const client = new DocsClient();
 * const docs = await client.listDocs();
 * const content = await client.getDoc('automations-quickstart');
 * ```
 */
export class DocsClient {
	private readonly owner = 'Databasin-AI';
	private readonly repo = 'databasin-cli';
	private readonly branch = 'main';
	private readonly docsPath = 'docs';
	private readonly baseUrl = 'https://api.github.com';
	private config: CliConfig;

	constructor(config?: CliConfig) {
		// Config is optional - we don't need it for GitHub API calls
		// but we keep it for consistency with other clients
		this.config = config || {} as CliConfig;
	}

	/**
	 * Build GitHub API URL for repository contents
	 */
	private buildRepoUrl(path: string): string {
		return `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;
	}

	/**
	 * Fetch from GitHub API
	 *
	 * Simple fetch wrapper with error handling for GitHub API.
	 * No authentication needed for public repositories.
	 */
	private async fetchGitHub<T>(url: string): Promise<T> {
		logger.debug(`[GitHub] GET ${url}`);

		const response = await fetch(url, {
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'Databasin-CLI'
			}
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`GitHub API error: ${response.status} ${response.statusText}\n${error}`);
		}

		return response.json() as Promise<T>;
	}

	/**
	 * Fetch raw file content from GitHub
	 *
	 * Uses the raw.githubusercontent.com URL for direct file access.
	 * More efficient than base64 decoding from API response.
	 */
	private async fetchRawContent(path: string): Promise<string> {
		const url = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${path}`;
		logger.debug(`[GitHub] GET ${url}`);

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
		}

		return response.text();
	}

	/**
	 * List all documentation files
	 *
	 * Fetches the /docs directory contents and returns markdown files.
	 * Filters to only .md files and removes the .md extension for cleaner names.
	 *
	 * @returns Array of doc names (without .md extension)
	 *
	 * @example
	 * ```typescript
	 * const docs = await client.listDocs();
	 * // Returns: ['automations-quickstart', 'pipelines-guide', ...]
	 * ```
	 */
	async listDocs(): Promise<string[]> {
		const url = this.buildRepoUrl(this.docsPath);
		const files = await this.fetchGitHub<GitHubFile[]>(url);

		// Filter to markdown files and remove .md extension
		return files
			.filter(file => file.type === 'file' && file.name.endsWith('.md'))
			.map(file => file.name.replace(/\.md$/, ''))
			.sort();
	}

	/**
	 * Get documentation file content
	 *
	 * Fetches the raw markdown content of a specific documentation file.
	 * Accepts name with or without .md extension.
	 *
	 * @param docName - Document name (e.g., 'automations-quickstart' or 'automations-quickstart.md')
	 * @returns Raw markdown content
	 * @throws Error if document not found
	 *
	 * @example
	 * ```typescript
	 * const content = await client.getDoc('automations-quickstart');
	 * console.log(content);
	 * ```
	 */
	async getDoc(docName: string): Promise<string> {
		// Add .md extension if not present
		const fileName = docName.endsWith('.md') ? docName : `${docName}.md`;
		const filePath = `${this.docsPath}/${fileName}`;

		return this.fetchRawContent(filePath);
	}

	/**
	 * Check if a documentation file exists
	 *
	 * Verifies if a doc exists in the repository without fetching full content.
	 *
	 * @param docName - Document name
	 * @returns True if doc exists, false otherwise
	 */
	async docExists(docName: string): Promise<boolean> {
		try {
			const docs = await this.listDocs();
			return docs.includes(docName.replace(/\.md$/, ''));
		} catch {
			return false;
		}
	}

	/**
	 * Get default local docs directory
	 *
	 * @returns Path to ~/.databasin/docs
	 */
	getDefaultDocsDir(): string {
		const home = process.env.HOME || process.env.USERPROFILE || '';
		return path.join(home, '.databasin', 'docs');
	}

	/**
	 * Check if local docs cache exists
	 *
	 * @param docsDir - Directory to check (defaults to ~/.databasin/docs)
	 * @returns True if local docs exist
	 */
	hasLocalDocs(docsDir?: string): boolean {
		const dir = docsDir || this.getDefaultDocsDir();
		try {
			return fs.existsSync(dir) && fs.readdirSync(dir).some(f => f.endsWith('.md'));
		} catch {
			return false;
		}
	}

	/**
	 * List local documentation files
	 *
	 * @param docsDir - Directory to read from (defaults to ~/.databasin/docs)
	 * @returns Array of doc names (without .md extension)
	 */
	listLocalDocs(docsDir?: string): string[] {
		const dir = docsDir || this.getDefaultDocsDir();
		try {
			return fs.readdirSync(dir)
				.filter(f => f.endsWith('.md'))
				.map(f => f.replace(/\.md$/, ''))
				.sort();
		} catch {
			return [];
		}
	}

	/**
	 * Get documentation from local cache
	 *
	 * @param docName - Document name
	 * @param docsDir - Directory to read from (defaults to ~/.databasin/docs)
	 * @returns Raw markdown content or null if not found
	 */
	getLocalDoc(docName: string, docsDir?: string): string | null {
		const dir = docsDir || this.getDefaultDocsDir();
		const fileName = docName.endsWith('.md') ? docName : `${docName}.md`;
		const filePath = path.join(dir, fileName);

		try {
			return fs.readFileSync(filePath, 'utf-8');
		} catch {
			return null;
		}
	}

	/**
	 * Download all documentation to local directory
	 *
	 * @param outputDir - Directory to save docs (defaults to ~/.databasin/docs)
	 * @returns Number of files downloaded
	 */
	async downloadAllDocs(outputDir?: string): Promise<number> {
		const dir = outputDir || this.getDefaultDocsDir();

		// Ensure directory exists
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		// Get list of all docs
		const docs = await this.listDocs();

		// Download each doc
		let count = 0;
		for (const docName of docs) {
			try {
				const content = await this.getDoc(docName);
				const fileName = `${docName}.md`;
				const filePath = path.join(dir, fileName);
				fs.writeFileSync(filePath, content, 'utf-8');
				count++;
			} catch (error) {
				logger.debug(`[Docs] Failed to download ${docName}: ${error}`);
			}
		}

		return count;
	}

	/**
	 * Get documentation with automatic cache fallback
	 *
	 * Tries local cache first, falls back to GitHub if not found.
	 *
	 * @param docName - Document name
	 * @param preferLocal - Whether to prefer local cache (default: true)
	 * @returns Object with content and source
	 */
	async getDocWithCache(docName: string, preferLocal = true): Promise<{ content: string; source: 'local' | 'github' }> {
		if (preferLocal) {
			const localContent = this.getLocalDoc(docName);
			if (localContent !== null) {
				logger.debug(`[Docs] Using local cache for ${docName}`);
				return { content: localContent, source: 'local' };
			}
		}

		logger.debug(`[Docs] Fetching ${docName} from GitHub`);
		const content = await this.getDoc(docName);
		return { content, source: 'github' };
	}
}

/**
 * Create a new GitHub Docs client
 *
 * Factory function for creating docs client instances.
 *
 * @param config - Optional CLI configuration
 * @returns Configured DocsClient instance
 */
export function createDocsClient(config?: CliConfig): DocsClient {
	return new DocsClient(config);
}
