/**
 * Pipeline Template Commands
 *
 * Generate pipeline configurations from built-in templates for common integration patterns.
 * Templates provide pre-configured starting points that can be customized via interactive prompts.
 *
 * @module commands/pipelines-template
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import {
	listTemplates,
	findTemplate,
	findTemplateVariables,
	generateFromTemplate,
	type PipelineTemplate
} from '../utils/pipeline-templates.ts';
import {
	logInfo,
	logSuccess,
	logWarning,
	logError,
	startSpinner,
	succeedSpinner,
	failSpinner,
	type Ora
} from '../utils/progress.ts';
import { promptInput, promptSelect, promptConfirm } from '../utils/prompts.ts';
import type { CliConfig } from '../types/config.ts';
import { formatOutput, detectFormat } from '../utils/formatters.ts';

/**
 * List Command
 * Display all available pipeline templates
 */
async function listCommand(
	options: {
		type?: string;
	},
	command: Command
): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;

	try {
		// Get templates (optionally filtered by type)
		const templates = listTemplates(options.type);

		if (templates.length === 0) {
			if (options.type) {
				logWarning(`No templates found for type: ${options.type}`);
			} else {
				logWarning('No templates available');
			}
			return;
		}

		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		// Format for display
		const displayData = templates.map((t) => ({
			name: t.name,
			source: t.sourceType,
			target: t.targetType,
			description: t.description
		}));

		const output = formatOutput(displayData, format, {
			colors: config.output.colors
		});

		console.log();
		console.log(output);

		if (format === 'table') {
			console.log();
			logInfo(`Found ${templates.length} template${templates.length === 1 ? '' : 's'}`);
			logInfo('Use: databasin pipelines template generate <name> to create from template');
		}
	} catch (error) {
		logError('Error listing templates', error instanceof Error ? error : undefined);
		throw error;
	}
}

/**
 * Show Command
 * Display details of a specific template
 */
async function showCommand(templateName: string, command: Command): Promise<void> {
	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;

	try {
		const template = findTemplate(templateName);
		if (!template) {
			logError(`Template "${templateName}" not found`);
			console.log();
			logInfo('Available templates:');
			const templates = listTemplates();
			templates.forEach((t) => console.log(`  ${chalk.cyan(t.name)}`));
			console.log();
			logInfo('Use: databasin pipelines template list');
			process.exit(1);
		}

		// Determine output format
		const cliFormat = opts.json ? 'json' : opts.csv ? 'csv' : undefined;
		const format = detectFormat(cliFormat, config.output.format);

		if (format === 'json') {
			const output = formatOutput(template, 'json', { colors: config.output.colors });
			console.log(output);
			return;
		}

		// Table format - show detailed view
		console.log();
		console.log(chalk.bold.cyan(`Template: ${template.name}`));
		console.log();
		console.log(chalk.gray('Description:'));
		console.log(`  ${template.description}`);
		console.log();
		console.log(chalk.gray('Connectors:'));
		console.log(`  Source:  ${chalk.cyan(template.sourceType)}`);
		console.log(`  Target:  ${chalk.cyan(template.targetType)}`);
		console.log();

		// Extract and show required variables
		const variables = findTemplateVariables(template.config);
		if (variables.length > 0) {
			console.log(chalk.gray('Required Variables:'));
			variables.forEach((varName) => {
				console.log(`  ${chalk.yellow(`{${varName}}`)}`);
			});
			console.log();
		}

		// Show configuration preview
		console.log(chalk.gray('Configuration Preview:'));
		const configStr = JSON.stringify(template.config, null, 2);
		const highlighted = configStr.replace(/\{([^}]+)\}/g, (match) => chalk.yellow(match));
		console.log(highlighted);
		console.log();

		logInfo(`Generate config: databasin pipelines template generate ${templateName}`);
	} catch (error) {
		logError('Error showing template', error instanceof Error ? error : undefined);
		throw error;
	}
}

/**
 * Generate Command
 * Generate pipeline configuration from template
 */
async function generateCommand(
	templateName: string,
	options: {
		output?: string;
		interactive?: boolean;
	},
	command: Command
): Promise<void> {
	let spinner: Ora | undefined;

	try {
		// Find template
		const template = findTemplate(templateName);
		if (!template) {
			logError(`Template "${templateName}" not found`);
			console.log();
			logInfo('Available templates:');
			const templates = listTemplates();
			templates.forEach((t) => console.log(`  ${chalk.cyan(t.name)}`));
			console.log();
			logInfo('Use: databasin pipelines template list');
			process.exit(1);
		}

		console.log();
		console.log(chalk.bold.cyan(`Template: ${template.name}`));
		console.log(chalk.gray(template.description));
		console.log();

		// Extract required variables
		const variables = findTemplateVariables(template.config);

		if (variables.length === 0) {
			logWarning('This template has no variables to configure');
			const config = template.config;

			// Output to file or stdout
			if (options.output) {
				writeFileSync(options.output, JSON.stringify(config, null, 2));
				logSuccess(`Configuration written to: ${options.output}`);
			} else {
				console.log(JSON.stringify(config, null, 2));
			}
			return;
		}

		// Interactive mode: prompt for each variable
		console.log(chalk.cyan('Configuration:'));
		console.log();

		const variableValues: Record<string, string> = {};

		for (const varName of variables) {
			// Provide helpful hints based on variable name
			const hint = getVariableHint(varName);
			const prompt = hint ? `${varName} (${hint})` : varName;

			const value = await promptInput(`Enter ${prompt}:`, undefined, (val) => {
				if (!val || val.trim().length === 0) {
					return `${varName} is required`;
				}
				return true;
			});

			variableValues[varName] = value.trim();
		}

		// Generate configuration
		console.log();
		spinner = startSpinner('Generating pipeline configuration...');

		const config = generateFromTemplate(templateName, variableValues);

		succeedSpinner(spinner, 'Configuration generated successfully');

		// Show preview
		console.log();
		console.log(chalk.cyan('Generated Configuration:'));
		console.log(chalk.gray(JSON.stringify(config, null, 2)));
		console.log();

		// Output to file or confirm
		let outputFile = options.output;

		if (!outputFile) {
			const useFile = await promptConfirm('Save configuration to file?', true);

			if (useFile) {
				outputFile = await promptInput(
					'Enter output filename:',
					`${templateName}-pipeline.json`
				);
			}
		}

		if (outputFile) {
			writeFileSync(outputFile, JSON.stringify(config, null, 2));
			console.log();
			logSuccess(`Configuration saved: ${outputFile}`);
			console.log();
			console.log(chalk.gray('Next steps:'));
			console.log(chalk.gray(`  1. Review and edit: ${outputFile}`));
			console.log(chalk.gray(`  2. Validate: databasin pipelines validate ${outputFile}`));
			console.log(chalk.gray(`  3. Create: databasin pipelines create ${outputFile}`));
		} else {
			console.log();
			console.log(JSON.stringify(config, null, 2));
		}
	} catch (error) {
		if (spinner) {
			failSpinner(spinner, 'Failed to generate configuration');
		}
		logError('Error generating from template', error instanceof Error ? error : undefined);
		throw error;
	}
}

/**
 * Get helpful hint for variable name
 *
 * @param varName - Variable name
 * @returns Hint string or empty string
 */
function getVariableHint(varName: string): string {
	const hints: Record<string, string> = {
		SOURCE_ID: 'source connector ID',
		TARGET_ID: 'target connector ID',
		SOURCE_NAME: 'source connector name',
		TARGET_NAME: 'target connector name',
		SOURCE_CATALOG: 'source catalog/database name',
		TARGET_CATALOG: 'target catalog/database name',
		SOURCE_SCHEMA: 'source schema name',
		TARGET_SCHEMA: 'target schema name',
		SOURCE_TABLE: 'source table name',
		TARGET_TABLE: 'target table name',
		TABLE_1: 'first table name',
		TABLE_2: 'second table name',
		TABLE_3: 'third table name',
		S3_BUCKET: 'S3 bucket name',
		FILE_PATH: 'file path or pattern',
		API_ENDPOINT: 'API endpoint URL',
		API_NAME: 'API name or service',
		JSON_PATH: 'JSONPath expression',
		KAFKA_TOPIC: 'Kafka topic name',
		PRIMARY_KEY: 'primary key column',
		CDC_COLUMN: 'CDC/timestamp column',
		DISTRIBUTION_KEY: 'distribution key column',
		SORT_KEY: 'sort key column',
		SALESFORCE_OBJECT: 'Salesforce object name',
		COLLECTION: 'MongoDB collection name',
		SOURCE_DATABASE: 'source database name',
		PRE_SCRIPT: 'pre-execution SQL script',
		POST_SCRIPT: 'post-execution SQL script'
	};

	return hints[varName] || '';
}

/**
 * Create pipeline template command
 *
 * @returns Configured Commander Command instance
 */
export function createPipelineTemplateCommand(): Command {
	const template = new Command('template').description(
		'Generate pipeline configurations from templates'
	);

	// List templates
	template
		.command('list')
		.description('List all available pipeline templates')
		.option('--type <type>', 'Filter by source or target connector type')
		.action(listCommand);

	// Show template details
	template
		.command('show <name>')
		.description('Show details of a specific template')
		.action(showCommand);

	// Generate from template
	template
		.command('generate <name>')
		.description('Generate pipeline configuration from template')
		.option('-o, --output <file>', 'Output filename (default: prompt or stdout)')
		.option(
			'-i, --interactive',
			'Interactive mode with prompts for all variables (default: true)',
			true
		)
		.action(generateCommand);

	return template;
}
