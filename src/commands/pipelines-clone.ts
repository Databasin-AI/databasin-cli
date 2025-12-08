/**
 * Pipeline Clone Command Implementation
 *
 * Provides functionality to clone existing pipelines with optional modifications.
 * Supports name, source, target, and schedule overrides with validation and dry-run mode.
 *
 * @module commands/pipelines-clone
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { PipelinesClient } from '../client/pipelines.ts';
import type { ConnectorsClient } from '../client/connectors.ts';
import type { CliConfig } from '../types/config.ts';
import type { Pipeline, Connector, JobDetails } from '../types/api.ts';
import { validatePipelineConfig, type PipelineConfig } from '../utils/pipeline-validator.ts';
import {
	startSpinner,
	succeedSpinner,
	failSpinner,
	logError,
	logInfo,
	type Ora
} from '../utils/progress.ts';
import { ApiError } from '../utils/errors.ts';
import { invalidateNamespace } from '../utils/cache.ts';

/**
 * Clone command options
 */
interface CloneOptions {
	/** Override pipeline name */
	name?: string;
	/** Override source connector ID */
	source?: string;
	/** Override target connector ID */
	target?: string;
	/** Override schedule (cron expression) */
	schedule?: string;
	/** Dry-run mode (preview without creating) */
	dryRun?: boolean;
}

/**
 * Connector lookup cache
 *
 * Prevents duplicate API calls for the same connector within a command execution.
 */
const connectorCache = new Map<string, Connector>();

/**
 * Get connector details with caching
 *
 * @param id - Connector ID
 * @param client - Connectors API client
 * @returns Connector object
 */
async function getConnector(id: string | number, client: ConnectorsClient): Promise<Connector> {
	const key = String(id);
	if (connectorCache.has(key)) {
		return connectorCache.get(key)!;
	}

	const connector = await client.getById(key);
	connectorCache.set(key, connector);
	return connector;
}

/**
 * Format connector display
 *
 * @param connector - Connector object
 * @returns Formatted string
 */
function formatConnector(connector: Connector): string {
	return `${connector.connectorName} (${connector.connectorID})`;
}

/**
 * Show diff between original and cloned configuration
 *
 * @param original - Original pipeline
 * @param cloned - Cloned configuration
 * @param connectorsClient - Connectors API client
 */
async function showChanges(
	original: Pipeline,
	cloned: PipelineConfig,
	connectorsClient: ConnectorsClient
): Promise<void> {
	console.log();
	console.log(chalk.bold('Changes:'));

	// Name
	const originalName = original.pipelineName;
	const clonedName = cloned.pipelineName;
	if (clonedName !== originalName) {
		console.log(
			`  ${chalk.yellow('~')} Name: "${originalName}" → "${clonedName}"`
		);
	} else {
		console.log(`  ${chalk.green('✓')} Name: "${originalName}" [unchanged]`);
	}

	// Source connector
	const originalSourceId = String(original.sourceConnectorID || original.sourceConnectorId);
	const clonedSourceId = String(cloned.sourceConnectorId);
	if (clonedSourceId !== originalSourceId) {
		const oldConnector = await getConnector(originalSourceId, connectorsClient);
		const newConnector = await getConnector(clonedSourceId, connectorsClient);
		console.log(
			`  ${chalk.yellow('~')} Source: ${formatConnector(oldConnector)} → ${formatConnector(newConnector)}`
		);
	} else {
		const connector = await getConnector(originalSourceId, connectorsClient);
		console.log(`  ${chalk.green('✓')} Source: ${formatConnector(connector)} [unchanged]`);
	}

	// Target connector
	const originalTargetId = String(original.targetConnectorID || original.targetConnectorId);
	const clonedTargetId = String(cloned.targetConnectorId);
	if (clonedTargetId !== originalTargetId) {
		const oldConnector = await getConnector(originalTargetId, connectorsClient);
		const newConnector = await getConnector(clonedTargetId, connectorsClient);
		console.log(
			`  ${chalk.yellow('~')} Target: ${formatConnector(oldConnector)} → ${formatConnector(newConnector)}`
		);
	} else {
		const connector = await getConnector(originalTargetId, connectorsClient);
		console.log(`  ${chalk.green('✓')} Target: ${formatConnector(connector)} [unchanged]`);
	}

	// Schedule
	const originalSchedule = original.jobDetails?.jobRunSchedule || 'None';
	const clonedSchedule = cloned.schedule || 'None';
	if (clonedSchedule !== originalSchedule) {
		console.log(
			`  ${chalk.yellow('~')} Schedule: "${originalSchedule}" → "${clonedSchedule}"`
		);
	} else {
		console.log(`  ${chalk.green('✓')} Schedule: "${originalSchedule}" [unchanged]`);
	}

	// Artifacts
	const artifactCount = original.items?.length || 0;
	console.log(`  ${chalk.green('✓')} Artifacts: ${artifactCount} ${artifactCount === 1 ? 'item' : 'items'} [unchanged]`);

	console.log();
}

/**
 * Show dry-run preview
 *
 * @param original - Original pipeline
 * @param cloned - Cloned configuration
 * @param connectorsClient - Connectors API client
 */
async function showDryRunPreview(
	original: Pipeline,
	cloned: PipelineConfig,
	connectorsClient: ConnectorsClient
): Promise<void> {
	console.log(chalk.bold('Preview: Pipeline would be cloned as follows'));
	console.log();

	// Original
	console.log(chalk.bold('Original:'));
	console.log(`  Name: ${original.pipelineName}`);

	const originalSourceId = String(original.sourceConnectorID || original.sourceConnectorId);
	const sourceConn = await getConnector(originalSourceId, connectorsClient);
	console.log(`  Source: ${formatConnector(sourceConn)}`);

	const originalTargetId = String(original.targetConnectorID || original.targetConnectorId);
	const targetConn = await getConnector(originalTargetId, connectorsClient);
	console.log(`  Target: ${formatConnector(targetConn)}`);

	const originalSchedule = original.jobDetails?.jobRunSchedule || 'None';
	console.log(`  Schedule: ${originalSchedule}`);

	const originalArtifactCount = original.items?.length || 0;
	console.log(`  Artifacts: ${originalArtifactCount} ${originalArtifactCount === 1 ? 'item' : 'items'}`);

	console.log();

	// Cloned
	console.log(chalk.bold('Cloned:'));
	console.log(`  Name: ${cloned.pipelineName}`);

	const clonedSourceId = String(cloned.sourceConnectorId);
	const newSourceConn = await getConnector(clonedSourceId, connectorsClient);
	const sourceUnchanged = clonedSourceId === originalSourceId;
	console.log(
		`  Source: ${formatConnector(newSourceConn)}${sourceUnchanged ? '    [unchanged]' : ''}`
	);

	const clonedTargetId = String(cloned.targetConnectorId);
	const newTargetConn = await getConnector(clonedTargetId, connectorsClient);
	const targetUnchanged = clonedTargetId === originalTargetId;
	console.log(
		`  Target: ${formatConnector(newTargetConn)}${targetUnchanged ? '    [unchanged]' : ''}`
	);

	const clonedSchedule = cloned.schedule || 'None';
	const scheduleUnchanged = clonedSchedule === originalSchedule;
	console.log(
		`  Schedule: ${clonedSchedule}${scheduleUnchanged ? '                 [unchanged]' : ''}`
	);

	const clonedArtifactCount = cloned.artifacts?.length || 0;
	const artifactsUnchanged = clonedArtifactCount === originalArtifactCount;
	console.log(
		`  Artifacts: ${clonedArtifactCount} ${clonedArtifactCount === 1 ? 'item' : 'items'}${artifactsUnchanged ? '                [unchanged]' : ''}`
	);

	console.log();
	console.log(chalk.green('✓ Dry run successful'));
	console.log('Use --confirm (or remove --dry-run) to create this pipeline');
}

/**
 * Clone an existing pipeline with optional modifications
 *
 * @param pipelineId - Pipeline ID to clone
 * @param options - Clone options (name, source, target, schedule, dry-run)
 * @param command - Commander command instance
 */
export async function cloneCommand(
	pipelineId: string,
	options: CloneOptions,
	command: Command
): Promise<void> {
	// Clear connector cache for this operation
	connectorCache.clear();

	const opts = command.optsWithGlobals();
	const config: CliConfig = opts._config;
	const pipelinesClient: PipelinesClient = opts._clients.pipelines;
	const connectorsClient: ConnectorsClient = opts._clients.connectors;

	let spinner: Ora | undefined;

	try {
		// 1. Fetch source pipeline
		spinner = startSpinner('Fetching source pipeline...');
		const sourcePipeline = await pipelinesClient.getById(pipelineId);
		succeedSpinner(spinner, `Source pipeline loaded: ${sourcePipeline.pipelineName} (${sourcePipeline.pipelineID})`);

		// 2. Create cloned configuration
		const clonedConfig: PipelineConfig = {
			pipelineName: options.name || `${sourcePipeline.pipelineName} (Clone)`,
			sourceConnectorId: options.source
				? parseInt(options.source, 10)
				: (sourcePipeline.sourceConnectorID || sourcePipeline.sourceConnectorId),
			targetConnectorId: options.target
				? parseInt(options.target, 10)
				: (sourcePipeline.targetConnectorID || sourcePipeline.targetConnectorId),
			schedule: options.schedule || sourcePipeline.jobDetails?.jobRunSchedule || undefined,
			artifacts: sourcePipeline.items || []
		};

		// 3. Validate configuration
		spinner = startSpinner('Validating configuration...');
		const validationResult = await validatePipelineConfig(clonedConfig, {
			connectors: connectorsClient
		});

		if (!validationResult.valid) {
			failSpinner(spinner, 'Validation failed');
			console.log();
			console.log(chalk.red('Validation Errors:'));
			for (const error of validationResult.errors) {
				console.log(`  ${chalk.red('✖')} ${error.field}: ${error.message}`);
			}
			process.exit(1);
		}

		if (validationResult.warnings.length > 0) {
			succeedSpinner(spinner, 'Configuration valid (with warnings)');
			console.log();
			console.log(chalk.yellow('Warnings:'));
			for (const warning of validationResult.warnings) {
				console.log(`  ${chalk.yellow('⚠')} ${warning.field}: ${warning.message}`);
			}
		} else {
			succeedSpinner(spinner, 'Configuration valid');
		}

		// 4. Show diff
		await showChanges(sourcePipeline, clonedConfig, connectorsClient);

		// 5. Dry-run mode
		if (options.dryRun) {
			await showDryRunPreview(sourcePipeline, clonedConfig, connectorsClient);
			return;
		}

		// 6. Create cloned pipeline
		spinner = startSpinner('Creating pipeline...');

		// Build PipelineData object matching the API requirements
		const pipelineData = {
			pipelineName: clonedConfig.pipelineName,
			sourceConnectorID: String(clonedConfig.sourceConnectorId),
			targetConnectorID: String(clonedConfig.targetConnectorId),
			institutionID: sourcePipeline.institutionID,
			internalID: sourcePipeline.internalID,
			ownerID: sourcePipeline.ownerID,
			isPrivate: sourcePipeline.isPrivate,
			ingestionPattern: sourcePipeline.ingestionPattern,
			sourceNamingConvention: sourcePipeline.sourceNamingConvention,
			createCatalogs: sourcePipeline.createCatalogs,
			targetCatalogName: sourcePipeline.targetCatalogName,
			targetSchemaName: sourcePipeline.targetSchemaName,
			sourceCatalog: sourcePipeline.sourceCatalog,
			sourceSchema: sourcePipeline.sourceSchema,
			jobDetails: {
				...sourcePipeline.jobDetails,
				jobRunSchedule: clonedConfig.schedule || sourcePipeline.jobDetails?.jobRunSchedule
			},
			items: clonedConfig.artifacts
		};

		const newPipeline = await pipelinesClient.create(pipelineData);

		// Invalidate pipeline list cache
		invalidateNamespace('api', 'pipelines');

		succeedSpinner(spinner, `Pipeline created: ${newPipeline.pipelineID}`);

		console.log();
		console.log(chalk.bold('Next steps:'));
		console.log(`  ${chalk.cyan('$')} databasin pipelines run ${newPipeline.pipelineID}    # Test the cloned pipeline`);
		console.log(`  ${chalk.cyan('$')} databasin pipelines logs ${newPipeline.pipelineID}   # View execution logs`);
	} catch (error: unknown) {
		if (spinner) {
			failSpinner(spinner, 'Failed to clone pipeline');
		}

		if (error instanceof ApiError) {
			if (error.statusCode === 404) {
				logError('Pipeline not found (404)');
				console.error(chalk.gray(`  Pipeline ID: ${pipelineId}`));
				console.error(
					chalk.gray(`  Suggestion: Run 'databasin pipelines list --project <id>' to see available pipelines`)
				);
			} else if (error.statusCode === 400) {
				logError('Invalid pipeline configuration (400)');
				console.error(chalk.gray(`  Suggestion: Check the pipeline configuration schema`));
				if (error.responseBody) {
					console.error(chalk.gray(`  Details: ${JSON.stringify(error.responseBody, null, 2)}`));
				}
			} else {
				logError('Error cloning pipeline', error);
			}
		} else if (error instanceof Error) {
			logError('Error cloning pipeline', error);
			if (opts.debug) {
				console.error(error.stack);
			}
		}

		process.exit(1);
	} finally {
		// Clear connector cache
		connectorCache.clear();
	}
}
