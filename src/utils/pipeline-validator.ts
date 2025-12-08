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
 * Validate cron expression format and field values
 *
 * Supports standard 5-field cron: minute hour day month weekday
 * Optional 6th field for year is also supported
 *
 * Validates:
 * - Field count (5 or 6)
 * - Field value ranges (0-59 for minutes, 0-23 for hours, etc.)
 * - Wildcards, ranges (1-5), steps (star/5), and lists (1,3,5)
 *
 * @param expr - Cron expression to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidCronExpression('0 0 * * *')            // true - daily at midnight
 * isValidCronExpression('0/15 9-17 * * 1-5')    // true - every 15 min, business hours, weekdays
 * isValidCronExpression('0 0 * * * 2024')       // true - with year field
 * isValidCronExpression('60 * * * *')           // false - minute out of range
 * isValidCronExpression('invalid')              // false - invalid format
 * ```
 */
export function isValidCronExpression(expr: string): boolean {
	const parts = expr.trim().split(/\s+/);

	// Must be 5 or 6 fields
	if (parts.length !== 5 && parts.length !== 6) {
		return false;
	}

	// Field validators: [min, max] for each position
	const validators = [
		{ min: 0, max: 59, name: 'minute' }, // 0-59
		{ min: 0, max: 23, name: 'hour' }, // 0-23
		{ min: 1, max: 31, name: 'day' }, // 1-31
		{ min: 1, max: 12, name: 'month' }, // 1-12
		{ min: 0, max: 6, name: 'weekday' }, // 0-6 (Sunday=0)
		{ min: 1970, max: 3000, name: 'year' } // Optional year
	];

	for (let i = 0; i < parts.length; i++) {
		if (!isValidCronField(parts[i], validators[i])) {
			return false;
		}
	}

	return true;
}

/**
 * Validate a single cron field
 *
 * Supports:
 * - Wildcard: star
 * - Ranges: 1-5
 * - Steps: star/5 or 10-20/2
 * - Lists: 1,3,5
 *
 * @param field - Field value to validate
 * @param range - Valid range for this field
 * @returns True if valid
 */
function isValidCronField(
	field: string,
	range: { min: number; max: number; name: string }
): boolean {
	// Wildcard
	if (field === '*') {
		return true;
	}

	// List (e.g., "1,3,5")
	if (field.includes(',')) {
		const parts = field.split(',');
		return parts.every((part) => isValidCronField(part.trim(), range));
	}

	// Step (e.g., "*/5" or "10-20/2")
	if (field.includes('/')) {
		const [rangeOrWildcard, step] = field.split('/');

		// Validate step value
		const stepNum = parseInt(step, 10);
		if (isNaN(stepNum) || stepNum < 1) {
			return false;
		}

		// Validate range part
		if (rangeOrWildcard === '*') {
			return true;
		}
		return isValidCronField(rangeOrWildcard, range);
	}

	// Range (e.g., "10-20")
	if (field.includes('-')) {
		const [start, end] = field.split('-').map((s) => parseInt(s, 10));
		if (isNaN(start) || isNaN(end)) {
			return false;
		}
		return (
			start >= range.min &&
			start <= range.max &&
			end >= range.min &&
			end <= range.max &&
			start <= end
		);
	}

	// Single number
	const num = parseInt(field, 10);
	if (isNaN(num)) {
		return false;
	}
	return num >= range.min && num <= range.max;
}
