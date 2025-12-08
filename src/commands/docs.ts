/**
 * Documentation Commands for Databasin CLI
 *
 * Provides commands for browsing and viewing CLI documentation from GitHub:
 * - docs: List all available documentation files
 * - docs <name>: Display specific documentation file (raw by default)
 * - docs <name> --pretty: Display with rich markdown formatting
 * - docs download [dir]: Download all docs to local cache
 *
 * @module commands/docs
 */

import { Command } from 'commander';
import type { DocsClient } from '../client/docs.ts';
import { renderMarkdown } from '../utils/markdown.ts';
import {
	logSuccess,
	logError,
	logInfo,
	startSpinner,
	succeedSpinner,
	failSpinner
} from '../utils/progress.ts';
import type { CliConfig } from '../types/config.ts';
import chalk from 'chalk';

/**
 * List all available documentation files
 */
async function listDocsCommand(options: {}, command: Command): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const docsClient: DocsClient = opts._clients.docs;

	// Check for local cache first
	const hasLocal = docsClient.hasLocalDocs();

	try {
		let docs: string[];
		let source: string;

		if (hasLocal) {
			docs = docsClient.listLocalDocs();
			source = 'local cache';
		} else {
			const spinner = startSpinner('Fetching documentation list from GitHub...');
			docs = await docsClient.listDocs();
			succeedSpinner(spinner, `Found ${docs.length} documentation files`);
			source = 'GitHub';
		}

		// First, show the docs-command guide
		try {
			const { content } = await docsClient.getDocWithCache('docs-command');
			console.log('');
			console.log(renderMarkdown(content, { colors: config.output.colors }));
		} catch (error) {
			// If docs-command.md doesn't exist, just show basic usage
			console.log('');
			console.log(chalk.bold('Documentation Command'));
			console.log('');
			console.log('View CLI documentation directly in your terminal.');
			console.log('');
			console.log(chalk.cyan('Usage:'));
			console.log(`  ${chalk.white('databasin docs')}                          ${chalk.dim('# List all docs')}`);
			console.log(`  ${chalk.white('databasin docs <name>')}                   ${chalk.dim('# View doc (raw markdown)')}`);
			console.log(`  ${chalk.white('databasin docs <name> --pretty')}          ${chalk.dim('# View with formatting')}`);
			console.log(`  ${chalk.white('databasin docs download')}                 ${chalk.dim('# Download for offline use')}`);
			console.log('');
		}

		// Then show the list of available docs
		console.log('');
		console.log(chalk.bold(`Available Documentation (${source}):`));
		console.log('');
		docs.forEach(doc => {
			console.log(`  ${chalk.cyan('•')} ${doc}`);
		});
		console.log('');

	} catch (error) {
		if (error instanceof Error) {
			logError(error.message);
		}
		process.exit(1);
	}
}

/**
 * Display a specific documentation file
 */
async function showDocCommand(docName: string, options: { pretty?: boolean }, command: Command): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const docsClient: DocsClient = opts._clients.docs;
	const pretty = options.pretty || false;

	try {
		// Try to get from cache first, fall back to GitHub
		const { content, source } = await docsClient.getDocWithCache(docName);

		if (source === 'github') {
			// Only show spinner message for GitHub fetches
			logInfo(`Fetched ${docName}.md from GitHub`);
		}

		// Output raw markdown by default, formatted with --pretty
		if (pretty) {
			console.log('');
			console.log(renderMarkdown(content, { colors: config.output.colors }));
			console.log('');
		} else {
			// Raw markdown output
			console.log(content);
		}

	} catch (error) {
		if (error instanceof Error) {
			logError(`Failed to fetch ${docName}.md: ${error.message}`);
			console.log('');
			console.log(chalk.dim('Tip: Run') + ' ' + chalk.white('databasin docs') + ' ' + chalk.dim('to see all available documentation'));
		}
		process.exit(1);
	}
}

/**
 * Download all documentation to local directory
 */
async function downloadDocsCommand(outputDir: string | undefined, options: {}, command: Command): Promise<void> {
	const opts = command.optsWithGlobals();
	const docsClient: DocsClient = opts._clients.docs;

	const dir = outputDir || docsClient.getDefaultDocsDir();
	const spinner = startSpinner(`Downloading documentation to ${dir}...`);

	try {
		const count = await docsClient.downloadAllDocs(dir);

		succeedSpinner(spinner, `Downloaded ${count} documentation files to ${dir}`);
		console.log('');
		logSuccess('Documentation cached locally for offline use');
		console.log('');
		console.log(chalk.dim(`View docs: ${chalk.white('databasin docs <name>')}`));
		console.log(chalk.dim(`Re-download: ${chalk.white('databasin docs download')} (always overwrites with latest from GitHub)`));
		console.log('');

	} catch (error) {
		failSpinner(spinner, 'Failed to download documentation');
		if (error instanceof Error) {
			logError(error.message);
		}
		process.exit(1);
	}
}

/**
 * Create docs command
 *
 * Creates the 'docs' command with:
 * - docs: List all docs (default action)
 * - docs <name>: Show specific doc (raw markdown)
 * - docs <name> --pretty: Show with formatting
 * - docs download [dir]: Download all docs
 */
export function createDocsCommand(): Command {
	const docs = new Command('docs')
		.description('View CLI documentation from GitHub repository or local cache')
		.argument('[name]', 'Documentation file to display (e.g., automations-quickstart)')
		.option('--pretty', 'Display with rich markdown formatting (default: raw markdown)')
		.addHelpText(
			'after',
			`
Examples:
  # List all available documentation
  $ databasin docs

  # View specific documentation (raw markdown)
  $ databasin docs quickstart
  $ databasin docs pipelines-guide

  # View with rich formatting
  $ databasin docs automations-quickstart --pretty

  # Download all docs for offline use (saves to ~/.databasin/docs)
  $ databasin docs download

  # Download to custom directory
  $ databasin docs download /path/to/docs

  # Pipe raw output
  $ databasin docs quickstart | grep -i "authentication"
  $ databasin docs pipelines-guide > pipelines.md

Notes:
  - Documentation is fetched from GitHub or local cache (~/.databasin/docs)
  - Local cache is checked first for faster access
  - Download command always overwrites with latest from GitHub
  - Use --pretty for terminal viewing, omit for scripting/piping
`
		)
		.action(async (name: string | undefined, options: { pretty?: boolean }, command: Command) => {
			// Handle special "download" argument
			if (name === 'download') {
				// No additional argument provided, use default directory
				await downloadDocsCommand(undefined, options, command);
			} else if (name) {
				await showDocCommand(name, options, command);
			} else {
				await listDocsCommand(options, command);
			}
		});

	// Add download subcommand for better discoverability
	docs.command('download [output-dir]')
		.description('Download all documentation to local directory for offline use')
		.action(async (outputDir: string | undefined, options: {}, command: Command) => {
			await downloadDocsCommand(outputDir, options, command.parent!);
		});

	return docs;
}
