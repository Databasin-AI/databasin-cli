/**
 * Pipeline Configuration Validator
 *
 * Validates pipeline configurations before creation to catch errors early.
 * Provides detailed validation errors and warnings for common issues.
 *
 * @module utils/pipeline-validator
 */

import type { ConnectorsClient } from '../client/connectors.ts';

/**
 * Validation result
 *
 * Contains validation status, errors, and warnings.
 */
export interface ValidationResult {
	/** Whether the configuration is valid (no errors) */
	valid: boolean;
	/** Validation errors (must be fixed) */
	errors: ValidationError[];
	/** Validation warnings (recommended fixes) */
	warnings: ValidationWarning[];
}

/**
 * Validation error (must be fixed)
 */
export interface ValidationError {
	/** Field that failed validation */
	field: string;
	/** Error message */
	message: string;
	/** Severity level */
	severity: 'error';
}

/**
 * Validation warning (recommended fix)
 */
export interface ValidationWarning {
	/** Field with warning */
	field: string;
	/** Warning message */
	message: string;
	/** Severity level */
	severity: 'warning';
}

/**
 * Pipeline configuration interface
 *
 * Minimal interface for validation - not all fields required.
 */
export interface PipelineConfig {
	pipelineName?: string;
	sourceConnectorId?: string | number;
	targetConnectorId?: string | number;
	schedule?: string;
	artifacts?: any[];
	[key: string]: any;
}

/**
 * Clients required for validation
 */
export interface ValidationClients {
	connectors: ConnectorsClient;
}

/**
 * Validate pipeline configuration
 *
 * Checks required fields, connector existence, schedule format, and artifacts.
 * Returns detailed validation result with errors and warnings.
 *
 * @param config - Pipeline configuration to validate
 * @param clients - API clients for validation (connector checks)
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = await validatePipelineConfig(config, { connectors: connectorsClient });
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
export async function validatePipelineConfig(
	config: PipelineConfig,
	clients: ValidationClients
): Promise<ValidationResult> {
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];

	// 1. Required fields
	if (!config.pipelineName) {
		errors.push({
			field: 'pipelineName',
			message: 'Pipeline name is required',
			severity: 'error'
		});
	} else {
		// Validate pipeline name format
		if (config.pipelineName.length < 3) {
			errors.push({
				field: 'pipelineName',
				message: 'Pipeline name must be at least 3 characters',
				severity: 'error'
			});
		}
		if (config.pipelineName.length > 100) {
			errors.push({
				field: 'pipelineName',
				message: 'Pipeline name must be less than 100 characters',
				severity: 'error'
			});
		}
	}

	if (!config.sourceConnectorId) {
		errors.push({
			field: 'sourceConnectorId',
			message: 'Source connector ID is required',
			severity: 'error'
		});
	}

	if (!config.targetConnectorId) {
		errors.push({
			field: 'targetConnectorId',
			message: 'Target connector ID is required',
			severity: 'error'
		});
	}

	// 2. Connector existence checks
	if (config.sourceConnectorId) {
		try {
			await clients.connectors.get(String(config.sourceConnectorId));
		} catch (error) {
			errors.push({
				field: 'sourceConnectorId',
				message: `Source connector ${config.sourceConnectorId} not found or inaccessible`,
				severity: 'error'
			});
		}
	}

	if (config.targetConnectorId) {
		try {
			await clients.connectors.get(String(config.targetConnectorId));
		} catch (error) {
			errors.push({
				field: 'targetConnectorId',
				message: `Target connector ${config.targetConnectorId} not found or inaccessible`,
				severity: 'error'
			});
		}
	}

	// 3. Schedule validation (cron format)
	if (config.schedule) {
		if (!isValidCronExpression(config.schedule)) {
			errors.push({
				field: 'schedule',
				message: `Invalid cron expression: "${config.schedule}". Must be 5 or 6 fields (minute hour day month weekday [year])`,
				severity: 'error'
			});
		}
	}

	// 4. Artifacts validation
	if (!config.artifacts || config.artifacts.length === 0) {
		warnings.push({
			field: 'artifacts',
			message: 'No artifacts configured - pipeline will not transfer any data',
			severity: 'warning'
		});
	} else {
		// Check each artifact has required fields
		for (let i = 0; i < config.artifacts.length; i++) {
			const artifact = config.artifacts[i];
			if (!artifact.sourceQuery && !artifact.sourceTable) {
				warnings.push({
					field: `artifacts[${i}]`,
					message: 'Artifact should have either sourceQuery or sourceTable defined',
					severity: 'warning'
				});
			}
			if (!artifact.targetTable) {
				warnings.push({
					field: `artifacts[${i}]`,
					message: 'Artifact should have targetTable defined',
					severity: 'warning'
				});
			}
		}
	}

	// 5. Source and target connector should be different
	if (config.sourceConnectorId && config.targetConnectorId) {
		if (String(config.sourceConnectorId) === String(config.targetConnectorId)) {
			warnings.push({
				field: 'sourceConnectorId, targetConnectorId',
				message: 'Source and target connectors are the same - this is unusual but allowed',
				severity: 'warning'
			});
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Validate cron expression format
 *
 * Checks if a string is a valid cron expression (5 or 6 fields).
 * Does not validate actual field values, just counts fields.
 *
 * @param expr - Cron expression to validate
 * @returns True if valid format
 *
 * @example
 * ```typescript
 * isValidCronExpression('0 0 * * *')      // true - 5 fields
 * isValidCronExpression('0 0 * * * 2024') // true - 6 fields
 * isValidCronExpression('invalid')        // false
 * ```
 */
export function isValidCronExpression(expr: string): boolean {
	// Simple cron validation: must have 5 or 6 whitespace-separated fields
	const parts = expr.trim().split(/\s+/);
	return parts.length === 5 || parts.length === 6;
}
