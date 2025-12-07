/**
 * Shell Completion Command Implementation
 *
 * Provides commands for generating and installing shell completions:
 * - completion bash: Generate bash completion script
 * - completion zsh: Generate zsh completion script
 * - completion fish: Generate fish completion script
 * - completion install: Automatically install completions for current shell
 *
 * @module commands/completion
 */

import { Command } from 'commander';
import { homedir } from 'os';
import { mkdirSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import {
	extractCommandStructure,
	generateBashCompletion,
	generateZshCompletion,
	generateFishCompletion
} from '../utils/completion-generator.ts';
import { logSuccess, logError, logInfo } from '../utils/progress.ts';

/**
 * Detect the current shell
 */
function detectShell(): string {
	const shell = process.env.SHELL || '';
	if (shell.includes('zsh')) return 'zsh';
	if (shell.includes('fish')) return 'fish';
	return 'bash'; // Default to bash
}

/**
 * Generate bash completion script
 */
async function bashCommand(_options: {}, command: Command): Promise<void> {
	const program = command.parent?.parent;
	if (!program) {
		throw new Error('Unable to access program instance');
	}

	const structure = extractCommandStructure(program);
	const completion = generateBashCompletion(structure);
	console.log(completion);
}

/**
 * Generate zsh completion script
 */
async function zshCommand(_options: {}, command: Command): Promise<void> {
	const program = command.parent?.parent;
	if (!program) {
		throw new Error('Unable to access program instance');
	}

	const structure = extractCommandStructure(program);
	const completion = generateZshCompletion(structure);
	console.log(completion);
}

/**
 * Generate fish completion script
 */
async function fishCommand(_options: {}, command: Command): Promise<void> {
	const program = command.parent?.parent;
	if (!program) {
		throw new Error('Unable to access program instance');
	}

	const structure = extractCommandStructure(program);
	const completion = generateFishCompletion(structure);
	console.log(completion);
}

/**
 * Install shell completions
 *
 * Automatically detects the shell and installs completions to the appropriate location.
 */
async function installCommand(
	options: {
		shell?: string;
		force?: boolean;
	},
	command: Command
): Promise<void> {
	const program = command.parent?.parent;
	if (!program) {
		throw new Error('Unable to access program instance');
	}

	const shell = options.shell || detectShell();
	const programName = program.name();

	logInfo(`Installing completions for ${chalk.cyan(shell)}...`);

	try {
		const structure = extractCommandStructure(program);
		let completion: string;
		let installPath: string;
		let installDir: string;

		switch (shell) {
			case 'bash': {
				completion = generateBashCompletion(structure);
				installDir = join(homedir(), '.bash_completion.d');
				installPath = join(installDir, programName);
				break;
			}
			case 'zsh': {
				completion = generateZshCompletion(structure);
				installDir = join(homedir(), '.zsh', 'completions');
				installPath = join(installDir, `_${programName}`);
				break;
			}
			case 'fish': {
				completion = generateFishCompletion(structure);
				installDir = join(homedir(), '.config', 'fish', 'completions');
				installPath = join(installDir, `${programName}.fish`);
				break;
			}
			default:
				throw new Error(`Unsupported shell: ${shell}`);
		}

		// Create directory if it doesn't exist
		try {
			mkdirSync(installDir, { recursive: true });
		} catch (err) {
			// Directory may already exist
		}

		// Write completion file
		writeFileSync(installPath, completion, 'utf8');

		// Make executable
		chmodSync(installPath, 0o644);

		logSuccess(`Completions installed to ${chalk.cyan(installPath)}`);

		// Provide setup instructions
		logInfo('\nTo use completions:');

		switch (shell) {
			case 'bash':
				console.log(`  1. Add this line to ${chalk.cyan('~/.bashrc')}:`);
				console.log(`     source ${installPath}`);
				console.log(`  2. Reload: ${chalk.cyan('source ~/.bashrc')}`);
				break;
			case 'zsh':
				console.log(`  1. Add this line to ${chalk.cyan('~/.zshrc')}:`);
				console.log(`     autoload -U +X compinit && compinit`);
				console.log(`  2. Reload: ${chalk.cyan('source ~/.zshrc')}`);
				break;
			case 'fish':
				console.log(`  Completions are automatically loaded from:${chalk.cyan(installPath)}`);
				console.log(`  Reload: ${chalk.cyan('source ~/.config/fish/config.fish')}`);
				break;
		}
	} catch (err) {
		logError(`Failed to install completions: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(1);
	}
}

/**
 * Create completion command group
 */
export function createCompletionCommand(): Command {
	const completion = new Command('completion');

	completion
		.description('Manage shell completions (bash/zsh/fish)')
		.addHelpText(
			'after',
			`
Examples:
  # Generate bash completion script
  databasin completion bash

  # Generate zsh completion script
  databasin completion zsh

  # Generate fish completion script
  databasin completion fish

  # Install completions automatically
  databasin completion install

  # Install completions for specific shell
  databasin completion install --shell zsh

  # Source completions in shell config
  source <(databasin completion bash)
`
		);

	// bash subcommand
	completion
		.command('bash')
		.description('Generate bash completion script')
		.action(bashCommand);

	// zsh subcommand
	completion
		.command('zsh')
		.description('Generate zsh completion script')
		.action(zshCommand);

	// fish subcommand
	completion
		.command('fish')
		.description('Generate fish completion script')
		.action(fishCommand);

	// install subcommand
	completion
		.command('install')
		.description('Install completions for current shell')
		.option('--shell <shell>', 'Shell type (bash, zsh, fish) [auto-detected]')
		.option('--force', 'Overwrite existing completions')
		.action(installCommand);

	return completion;
}
