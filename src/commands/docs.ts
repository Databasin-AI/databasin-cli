/**
 * Documentation Commands for Databasin CLI
 *
 * Provides commands for browsing and viewing CLI documentation:
 * - docs: List all available documentation files
 * - docs <name>: Display specific documentation file (raw by default)
 * - docs <name> --pretty: Display with rich markdown formatting
 *
 * Documentation is fetched from the public GitHub repository.
 *
 * @module commands/docs
 */

import { Command } from 'commander';
import type { DocsClient } from '../client/docs.ts';
import { renderMarkdown } from '../utils/markdown.ts';
import {
	logError,
	startSpinner,
	succeedSpinner
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

	try {
		// Fetch documentation list from GitHub
		const spinner = startSpinner('Fetching documentation list from GitHub...');
		const docs = await docsClient.listDocs();
		succeedSpinner(spinner, `Found ${docs.length} documentation files`);

		// First, show the docs-command guide
		try {
			const content = await docsClient.getDoc('docs-command');
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
			console.log('');
		}

		// Then show the list of available docs
		console.log('');
		console.log(chalk.bold('Available Documentation:'));
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
		// Get doc from GitHub
		const content = await docsClient.getDoc(docName);

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
 * Create docs command
 *
 * Creates the 'docs' command with:
 * - docs: List all docs (default action)
 * - docs <name>: Show specific doc (raw markdown)
 * - docs <name> --pretty: Show with formatting
 */
export function createDocsCommand(): Command {
	const docs = new Command('docs')
		.description('View CLI documentation from GitHub')
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

  # Pipe raw output
  $ databasin docs quickstart | grep -i "authentication"
  $ databasin docs pipelines-guide > pipelines.md

Notes:
  - Documentation is fetched from the public GitHub repository
  - Use --pretty for terminal viewing, omit for scripting/piping
  - Raw markdown by default - perfect for grep, awk, sed, etc.
`
		)
		.action(async (name: string | undefined, options: { pretty?: boolean }, command: Command) => {
			if (name) {
				await showDocCommand(name, options, command);
			} else {
				await listDocsCommand(options, command);
			}
		});

	return docs;
}
