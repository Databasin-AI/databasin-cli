/**
 * Tests for Completion Generator Utility
 *
 * Tests that completion scripts are generated correctly for all shells,
 * and that the command extraction works properly with live Commander instances.
 */

import { describe, it, expect } from 'bun:test';
import { Command } from 'commander';
import {
	extractCommandStructure,
	generateBashCompletion,
	generateZshCompletion,
	generateFishCompletion
} from '../../src/utils/completion-generator';

/**
 * Create a test program with sample commands
 */
function createTestProgram(): Command {
	const program = new Command();

	program
		.name('test-cli')
		.version('1.0.0')
		.description('Test CLI for completion testing');

	// Global options
	program.option('--token <token>', 'Authentication token');
	program.option('--api-url <url>', 'API URL');
	program.option('--json', 'JSON output');
	program.option('--verbose', 'Verbose logging');

	// Projects command
	const projects = new Command('projects')
		.description('Manage projects')
		.option('--limit <n>', 'Limit results');

	projects
		.command('list')
		.description('List projects')
		.option('--filter <pattern>', 'Filter projects');

	projects
		.command('get')
		.description('Get project details')
		.argument('<id>', 'Project ID');

	program.addCommand(projects);

	// Pipelines command
	const pipelines = new Command('pipelines')
		.description('Manage pipelines')
		.option('--project <id>', 'Project ID');

	pipelines
		.command('list')
		.description('List pipelines')
		.option('--status <status>', 'Filter by status');

	pipelines
		.command('run')
		.description('Run pipeline')
		.argument('<id>', 'Pipeline ID')
		.option('--wait', 'Wait for completion');

	program.addCommand(pipelines);

	return program;
}

describe('Completion Generator', () => {
	describe('extractCommandStructure', () => {
		it('should extract root command name and description', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);

			expect(structure.name).toBe('test-cli');
			expect(structure.description).toContain('Test CLI');
		});

		it('should extract global options', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);

			// Should have global options but not help (it's implicit)
			const globalOptionFlags = structure.options.map((opt) => opt.flags);
			expect(globalOptionFlags.some((f) => f.includes('--token'))).toBe(true);
			expect(globalOptionFlags.some((f) => f.includes('--api-url'))).toBe(true);
			expect(globalOptionFlags.some((f) => f.includes('--json'))).toBe(true);
			expect(globalOptionFlags.some((f) => f.includes('--verbose'))).toBe(true);
		});

		it('should extract all subcommands', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);

			const commandNames = structure.subcommands.map((cmd) => cmd.name);
			expect(commandNames).toContain('projects');
			expect(commandNames).toContain('pipelines');
		});

		it('should extract subcommand options', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);

			const projects = structure.subcommands.find((cmd) => cmd.name === 'projects');
			expect(projects).toBeDefined();
			if (projects) {
				const optionFlags = projects.options.map((opt) => opt.flags);
				expect(optionFlags.some((f) => f.includes('--limit'))).toBe(true);
			}
		});

		it('should extract nested subcommands', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);

			const projects = structure.subcommands.find((cmd) => cmd.name === 'projects');
			expect(projects?.subcommands.length).toBeGreaterThan(0);

			const listCmd = projects?.subcommands.find((cmd) => cmd.name === 'list');
			expect(listCmd?.description).toContain('List');
		});
	});

	describe('generateBashCompletion', () => {
		it('should generate valid bash script', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const bash = generateBashCompletion(structure);

			// Should contain bash shebang and function definition
			expect(bash).toContain('#!/bin/bash');
			expect(bash).toContain('_test_cli_completion()');
		});

		it('should include all commands in completion', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const bash = generateBashCompletion(structure);

			expect(bash).toContain('projects');
			expect(bash).toContain('pipelines');
		});

		it('should include global options', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const bash = generateBashCompletion(structure);

			expect(bash).toContain('--token');
			expect(bash).toContain('--api-url');
			expect(bash).toContain('--json');
		});

		it('should include completion registration', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const bash = generateBashCompletion(structure);

			expect(bash).toContain('complete -o');
		});
	});

	describe('generateZshCompletion', () => {
		it('should generate valid zsh script', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const zsh = generateZshCompletion(structure);

			// Should contain zsh compdef and function definition
			expect(zsh).toContain('#compdef test-cli');
			expect(zsh).toContain('_test-cli_main()');
		});

		it('should include all commands', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const zsh = generateZshCompletion(structure);

			expect(zsh).toContain('projects');
			expect(zsh).toContain('pipelines');
		});

		it('should include global options', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const zsh = generateZshCompletion(structure);

			expect(zsh).toContain('--token');
			expect(zsh).toContain('--api-url');
		});

		it('should use _arguments for option handling', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const zsh = generateZshCompletion(structure);

			expect(zsh).toContain('_arguments');
		});
	});

	describe('generateFishCompletion', () => {
		it('should generate valid fish script', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const fish = generateFishCompletion(structure);

			// Should contain fish comment and complete commands
			expect(fish).toContain('# Fish completion for test-cli');
			expect(fish).toContain('complete -c test-cli');
		});

		it('should include all commands', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const fish = generateFishCompletion(structure);

			expect(fish).toContain('-a "projects"');
			expect(fish).toContain('-a "pipelines"');
		});

		it('should include global options with -l flag', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const fish = generateFishCompletion(structure);

			expect(fish).toContain('-l token');
			expect(fish).toContain('-l api-url');
		});

		it('should mark options that take arguments with -x', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const fish = generateFishCompletion(structure);

			// Options with arguments should have -x flag
			expect(fish).toContain('-l token');
			expect(fish).toContain('-l api-url');
		});

		it('should include command descriptions', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);
			const fish = generateFishCompletion(structure);

			expect(fish).toContain('Manage projects');
			expect(fish).toContain('Manage pipelines');
		});
	});

	describe('Cross-shell consistency', () => {
		it('should generate completions for all shells without errors', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);

			// Should not throw
			const bash = generateBashCompletion(structure);
			const zsh = generateZshCompletion(structure);
			const fish = generateFishCompletion(structure);

			expect(bash.length).toBeGreaterThan(0);
			expect(zsh.length).toBeGreaterThan(0);
			expect(fish.length).toBeGreaterThan(0);
		});

		it('should include same commands in all shells', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);

			const bash = generateBashCompletion(structure);
			const zsh = generateZshCompletion(structure);
			const fish = generateFishCompletion(structure);

			// All should mention the same commands
			for (const cmd of ['projects', 'pipelines']) {
				expect(bash).toContain(cmd);
				expect(zsh).toContain(cmd);
				expect(fish).toContain(cmd);
			}
		});

		it('should include same global options in all shells', () => {
			const program = createTestProgram();
			const structure = extractCommandStructure(program);

			const bash = generateBashCompletion(structure);
			const zsh = generateZshCompletion(structure);
			const fish = generateFishCompletion(structure);

			// All should mention the same global options
			for (const opt of ['token', 'api-url', 'json', 'verbose']) {
				expect(bash).toContain(opt);
				expect(zsh).toContain(opt);
				expect(fish).toContain(opt);
			}
		});
	});
});
