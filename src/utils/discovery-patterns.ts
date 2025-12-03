/**
 * Discovery Pattern Detection Utilities for DataBasin CLI
 *
 * Analyzes connector configurations to determine the correct discovery workflow.
 * DataBasin uses two main discovery patterns based on connector architecture:
 *
 * 1. RDBMS-Style (Screen 1): Single-level schema discovery
 *    - Used by: MySQL, Oracle, MariaDB, DB2, etc.
 *    - Screens: [1, 2, 3, 4, 5]
 *    - API: GET /api/connector/catalogs/:id (returns schemas directly)
 *
 * 2. Lakehouse-Style (Screens 6→7): Two-level database→schema discovery
 *    - Used by: Postgres, MSSQL, Databricks, Snowflake, etc.
 *    - Screens: [6, 7, 2, 3, 4, 5]
 *    - APIs: GET /api/v2/connector/catalogs/:id → GET /api/v2/connector/schemas/:id?catalog=X
 *
 * The pattern is determined by the `pipelineRequiredScreens` array in connector configuration.
 *
 * @see docs/DISCOVERY-WORKFLOW-GUIDE.md - Complete workflow documentation
 * @see static/config/pipelines/FlowbasinPipelineScreens.json - Screen definitions
 * @module utils/discovery-patterns
 */

import type { ConnectorConfiguration } from '../types/api.js';
import type { DiscoveryPattern, DiscoveryFlow, ValidationResult } from '../types/discovery.js';
import {
	SCREEN_CATALOGS,
	SCREEN_DATABASE,
	SCREEN_SCHEMA,
	SCREEN_ARTIFACTS
} from '../constants/screens.js';

/**
 * Determine discovery pattern from connector configuration
 *
 * Analyzes the `pipelineRequiredScreens` array to determine which discovery
 * workflow the connector uses. The pattern determines:
 * - Which API endpoints to call
 * - How many selection steps are required
 * - The structure of the discovery data
 *
 * Detection Logic:
 * - `lakehouse`: Screens include both 6 (Database/Catalog) and 7 (Schemas)
 * - `rdbms`: Screens include 1 (Catalogs/Schemas) but not 6 or 7
 * - `none`: No discovery screens present
 *
 * Edge Cases:
 * - Missing `pipelineRequiredScreens`: Returns 'none'
 * - Empty array: Returns 'none'
 * - Screen 7 without 6: Treats as 'rdbms' (schema-only, e.g., Microsoft Access)
 * - Both Screen 1 and Screen 6: Prefers 'lakehouse' (newer pattern)
 *
 * @param config - Connector configuration with pipelineRequiredScreens
 * @returns Discovery pattern type
 *
 * @example
 * ```typescript
 * // Postgres - Lakehouse pattern
 * const postgres = {
 *   connectorName: "Postgres",
 *   pipelineRequiredScreens: [6, 7, 2, 3, 4, 5],
 *   active: true
 * };
 * getDiscoveryPattern(postgres); // Returns: 'lakehouse'
 *
 * // MySQL - RDBMS pattern
 * const mysql = {
 *   connectorName: "MySQL",
 *   pipelineRequiredScreens: [1, 2, 3, 4, 5],
 *   active: true
 * };
 * getDiscoveryPattern(mysql); // Returns: 'rdbms'
 *
 * // Generic API - No discovery
 * const api = {
 *   connectorName: "Generic API",
 *   pipelineRequiredScreens: [8, 9, 10],
 *   active: true
 * };
 * getDiscoveryPattern(api); // Returns: 'none'
 * ```
 */
export function getDiscoveryPattern(config: ConnectorConfiguration): DiscoveryPattern {
	// Handle missing or invalid configuration
	if (!config?.pipelineRequiredScreens || !Array.isArray(config.pipelineRequiredScreens)) {
		return 'none';
	}

	const screens = config.pipelineRequiredScreens;

	// Empty screen array = no discovery
	if (screens.length === 0) {
		return 'none';
	}

	// Lakehouse pattern: Has both database and schema screens
	// This is the newer pattern used by Postgres, MSSQL, Databricks, Snowflake
	if (screens.includes(SCREEN_DATABASE) && screens.includes(SCREEN_SCHEMA)) {
		return 'lakehouse';
	}

	// RDBMS pattern: Has catalog/schema screen but not lakehouse screens
	// This is the legacy pattern used by MySQL, Oracle, MariaDB, DB2
	if (screens.includes(SCREEN_CATALOGS) && !screens.includes(SCREEN_DATABASE) && !screens.includes(SCREEN_SCHEMA)) {
		return 'rdbms';
	}

	// Edge case: Schema screen without database screen
	// Example: Microsoft Access has [7, 2, 3, 4, 5] - schema-only, no catalog level
	// Treat this as RDBMS-style single-level discovery
	if (screens.includes(SCREEN_SCHEMA) && !screens.includes(SCREEN_DATABASE)) {
		return 'rdbms';
	}

	// No discovery screens found
	return 'none';
}

/**
 * Check if connector requires database/catalog selection step
 *
 * Determines if the connector uses a two-level discovery with an initial
 * database/catalog selection before schema selection. This is characteristic
 * of lakehouse-style connectors.
 *
 * @param config - Connector configuration
 * @returns True if Screen 6 (Database) is required
 *
 * @example
 * ```typescript
 * requiresDatabaseSelection(postgresConfig);  // true
 * requiresDatabaseSelection(mysqlConfig);     // false
 * ```
 */
export function requiresDatabaseSelection(config: ConnectorConfiguration): boolean {
	if (!config?.pipelineRequiredScreens || !Array.isArray(config.pipelineRequiredScreens)) {
		return false;
	}
	return config.pipelineRequiredScreens.includes(SCREEN_DATABASE);
}

/**
 * Check if connector requires schema selection step
 *
 * Determines if the connector requires a schema selection step, either:
 * - Screen 1: RDBMS-style catalog/schema selection
 * - Screen 7: Lakehouse-style schema selection (within a catalog)
 *
 * Most connectors require schema selection in some form.
 *
 * @param config - Connector configuration
 * @returns True if Screen 1 or Screen 7 is required
 *
 * @example
 * ```typescript
 * requiresSchemaSelection(postgresConfig);  // true (Screen 7)
 * requiresSchemaSelection(mysqlConfig);     // true (Screen 1)
 * requiresSchemaSelection(apiConfig);       // false (no schemas)
 * ```
 */
export function requiresSchemaSelection(config: ConnectorConfiguration): boolean {
	if (!config?.pipelineRequiredScreens || !Array.isArray(config.pipelineRequiredScreens)) {
		return false;
	}
	const screens = config.pipelineRequiredScreens;
	return screens.includes(SCREEN_CATALOGS) || screens.includes(SCREEN_SCHEMA);
}

/**
 * Get ordered list of discovery screens for connector
 *
 * Extracts and orders the discovery-related screens (1, 6, 7) from the
 * connector's screen sequence. Returns them in the order they appear in
 * the workflow.
 *
 * Discovery Screen IDs:
 * - 1: Catalogs/Schemas (RDBMS-style)
 * - 6: Database/Catalog (Lakehouse first step)
 * - 7: Schemas (Lakehouse second step)
 *
 * @param config - Connector configuration
 * @returns Array of discovery screen IDs in workflow order
 *
 * @example
 * ```typescript
 * // Postgres [6, 7, 2, 3, 4, 5]
 * getDiscoveryScreens(postgresConfig);  // Returns: [6, 7]
 *
 * // MySQL [1, 2, 3, 4, 5]
 * getDiscoveryScreens(mysqlConfig);     // Returns: [1]
 *
 * // Microsoft Access [7, 2, 3, 4, 5]
 * getDiscoveryScreens(accessConfig);    // Returns: [7]
 *
 * // Generic API [8, 9, 10]
 * getDiscoveryScreens(apiConfig);       // Returns: []
 * ```
 */
export function getDiscoveryScreens(config: ConnectorConfiguration): number[] {
	if (!config?.pipelineRequiredScreens || !Array.isArray(config.pipelineRequiredScreens)) {
		return [];
	}

	const discoveryScreenIds = [SCREEN_CATALOGS, SCREEN_DATABASE, SCREEN_SCHEMA];

	// Filter to only discovery screens, preserving original order
	return config.pipelineRequiredScreens.filter((screenId) =>
		discoveryScreenIds.includes(screenId)
	);
}

/**
 * Check if connector uses legacy RDBMS discovery (single API call)
 *
 * Legacy RDBMS discovery uses a single API endpoint that returns schemas
 * directly in the response. This is simpler but less flexible than the
 * lakehouse pattern.
 *
 * API: GET /api/connector/catalogs/:id
 * Response: { objects: ['schema1', 'schema2', ...] }
 *
 * @param config - Connector configuration
 * @returns True if pattern is 'rdbms'
 *
 * @example
 * ```typescript
 * usesLegacyDiscovery(mysqlConfig);    // true
 * usesLegacyDiscovery(postgresConfig); // false
 * ```
 */
export function usesLegacyDiscovery(config: ConnectorConfiguration): boolean {
	return getDiscoveryPattern(config) === 'rdbms';
}

/**
 * Check if connector uses lakehouse discovery (two-phase)
 *
 * Lakehouse discovery uses two API calls:
 * 1. Get databases/catalogs: GET /api/v2/connector/catalogs/:id
 * 2. Get schemas for catalog: GET /api/v2/connector/schemas/:id?catalog=X
 *
 * This pattern is more flexible and supports hierarchical catalog structures.
 *
 * @param config - Connector configuration
 * @returns True if pattern is 'lakehouse'
 *
 * @example
 * ```typescript
 * usesLakehouseDiscovery(postgresConfig);   // true
 * usesLakehouseDiscovery(databricksConfig); // true
 * usesLakehouseDiscovery(mysqlConfig);      // false
 * ```
 */
export function usesLakehouseDiscovery(config: ConnectorConfiguration): boolean {
	return getDiscoveryPattern(config) === 'lakehouse';
}

/**
 * Get complete discovery flow information for a connector
 *
 * Aggregates all discovery-related metadata into a single object.
 * This is a convenience function that combines the results of all
 * other discovery detection functions.
 *
 * @param config - Connector configuration
 * @returns Complete discovery flow metadata
 *
 * @example
 * ```typescript
 * const postgresFlow = getDiscoveryFlow(postgresConfig);
 * // {
 * //   pattern: 'lakehouse',
 * //   requiresDatabase: true,
 * //   requiresSchema: true,
 * //   screens: [6, 7]
 * // }
 *
 * const mysqlFlow = getDiscoveryFlow(mysqlConfig);
 * // {
 * //   pattern: 'rdbms',
 * //   requiresDatabase: false,
 * //   requiresSchema: true,
 * //   screens: [1]
 * // }
 * ```
 */
export function getDiscoveryFlow(config: ConnectorConfiguration): DiscoveryFlow {
	return {
		pattern: getDiscoveryPattern(config),
		requiresDatabase: requiresDatabaseSelection(config),
		requiresSchema: requiresSchemaSelection(config),
		screens: getDiscoveryScreens(config)
	};
}

// ============================================================================
// TEST CASES (Inline Documentation)
// ============================================================================

/**
 * Test Case 1: Postgres (Lakehouse Pattern)
 *
 * Configuration:
 * ```typescript
 * const postgresConfig = {
 *   connectorName: "Postgres",
 *   pipelineRequiredScreens: [6, 7, 2, 3, 4, 5],
 *   active: true
 * };
 * ```
 *
 * Expected Results:
 * - getDiscoveryPattern(postgresConfig)           → 'lakehouse'
 * - requiresDatabaseSelection(postgresConfig)     → true
 * - requiresSchemaSelection(postgresConfig)       → true
 * - getDiscoveryScreens(postgresConfig)           → [6, 7]
 * - usesLegacyDiscovery(postgresConfig)           → false
 * - usesLakehouseDiscovery(postgresConfig)        → true
 *
 * Workflow:
 * 1. Call GET /api/v2/connector/catalogs/:id
 * 2. User selects database from objects array
 * 3. Call GET /api/v2/connector/schemas/:id?catalog=selectedDb
 * 4. User selects schema from objects array
 */

/**
 * Test Case 2: MySQL (RDBMS Pattern)
 *
 * Configuration:
 * ```typescript
 * const mysqlConfig = {
 *   connectorName: "MySQL",
 *   pipelineRequiredScreens: [1, 2, 3, 4, 5],
 *   active: true
 * };
 * ```
 *
 * Expected Results:
 * - getDiscoveryPattern(mysqlConfig)              → 'rdbms'
 * - requiresDatabaseSelection(mysqlConfig)        → false
 * - requiresSchemaSelection(mysqlConfig)          → true
 * - getDiscoveryScreens(mysqlConfig)              → [1]
 * - usesLegacyDiscovery(mysqlConfig)              → true
 * - usesLakehouseDiscovery(mysqlConfig)           → false
 *
 * Workflow:
 * 1. Call GET /api/connector/catalogs/:id
 * 2. User selects schema from objects array
 */

/**
 * Test Case 3: Microsoft Access (Schema-Only Pattern)
 *
 * Configuration:
 * ```typescript
 * const accessConfig = {
 *   connectorName: "Microsoft Access",
 *   pipelineRequiredScreens: [7, 2, 3, 4, 5],
 *   active: true
 * };
 * ```
 *
 * Expected Results:
 * - getDiscoveryPattern(accessConfig)             → 'rdbms'
 * - requiresDatabaseSelection(accessConfig)       → false
 * - requiresSchemaSelection(accessConfig)         → true
 * - getDiscoveryScreens(accessConfig)             → [7]
 * - usesLegacyDiscovery(accessConfig)             → true
 * - usesLakehouseDiscovery(accessConfig)          → false
 *
 * Workflow:
 * 1. Call GET /api/v2/connector/schemas/:id (no catalog parameter)
 * 2. User selects schema from objects array
 */

/**
 * Test Case 4: Generic API (No Discovery)
 *
 * Configuration:
 * ```typescript
 * const apiConfig = {
 *   connectorName: "Generic API",
 *   pipelineRequiredScreens: [8, 9, 10],
 *   active: true
 * };
 * ```
 *
 * Expected Results:
 * - getDiscoveryPattern(apiConfig)                → 'none'
 * - requiresDatabaseSelection(apiConfig)          → false
 * - requiresSchemaSelection(apiConfig)            → false
 * - getDiscoveryScreens(apiConfig)                → []
 * - usesLegacyDiscovery(apiConfig)                → false
 * - usesLakehouseDiscovery(apiConfig)             → false
 *
 * Workflow:
 * No discovery required - goes directly to API configuration screens
 */

/**
 * Test Case 5: Invalid/Missing Configuration
 *
 * Configuration:
 * ```typescript
 * const invalidConfig1 = {
 *   connectorName: "Invalid",
 *   pipelineRequiredScreens: null,
 *   active: true
 * };
 *
 * const invalidConfig2 = {
 *   connectorName: "Invalid",
 *   active: true
 *   // Missing pipelineRequiredScreens
 * };
 *
 * const invalidConfig3 = {
 *   connectorName: "Invalid",
 *   pipelineRequiredScreens: [],
 *   active: true
 * };
 * ```
 *
 * Expected Results (all invalid configs):
 * - getDiscoveryPattern(invalidConfig)            → 'none'
 * - requiresDatabaseSelection(invalidConfig)      → false
 * - requiresSchemaSelection(invalidConfig)        → false
 * - getDiscoveryScreens(invalidConfig)            → []
 * - usesLegacyDiscovery(invalidConfig)            → false
 * - usesLakehouseDiscovery(invalidConfig)         → false
 */

/**
 * Test Case 6: Databricks (Lakehouse Pattern)
 *
 * Configuration:
 * ```typescript
 * const databricksConfig = {
 *   connectorName: "Databricks",
 *   pipelineRequiredScreens: [6, 7, 2, 3, 4, 5],
 *   active: true
 * };
 * ```
 *
 * Expected Results:
 * - getDiscoveryPattern(databricksConfig)         → 'lakehouse'
 * - requiresDatabaseSelection(databricksConfig)   → true
 * - requiresSchemaSelection(databricksConfig)     → true
 * - getDiscoveryScreens(databricksConfig)         → [6, 7]
 * - usesLegacyDiscovery(databricksConfig)         → false
 * - usesLakehouseDiscovery(databricksConfig)      → true
 *
 * Workflow:
 * 1. Call GET /api/v2/connector/catalogs/:id
 * 2. User selects catalog from objects array
 * 3. Call GET /api/v2/connector/schemas/:id?catalog=selectedCatalog
 * 4. User selects schema from objects array
 */

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate connector discovery configuration
 *
 * Checks for common configuration errors that could cause runtime issues.
 * Call this before using connector configuration in discovery workflows.
 *
 * @param config - Connector configuration to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const validation = validateConnectorConfiguration(config);
 *
 * if (!validation.valid) {
 *     console.error('Invalid configuration:', validation.errors);
 *     return;
 * }
 *
 * if (validation.warnings.length > 0) {
 *     validation.warnings.forEach(w => console.warn(w));
 * }
 * ```
 */
export function validateConnectorConfiguration(
	config: ConnectorConfiguration
): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Check for missing configuration
	if (!config) {
		errors.push('Configuration is null or undefined');
		return { valid: false, errors, warnings };
	}

	// Check for missing connector name
	if (!config.connectorName) {
		errors.push('Missing connectorName in configuration');
	}

	// Check for missing or invalid screens array
	if (!config.pipelineRequiredScreens) {
		errors.push('Missing pipelineRequiredScreens array');
		return { valid: false, errors, warnings };
	}

	if (!Array.isArray(config.pipelineRequiredScreens)) {
		errors.push('pipelineRequiredScreens is not an array');
		return { valid: false, errors, warnings };
	}

	const screens = config.pipelineRequiredScreens;

	// Check for empty screens array
	if (screens.length === 0) {
		warnings.push(
			'pipelineRequiredScreens is empty - connector will have no discovery workflow'
		);
	}

	// Check for conflicting discovery patterns
	if (screens.includes(SCREEN_CATALOGS) && screens.includes(SCREEN_DATABASE)) {
		warnings.push(
			`Configuration includes both Screen ${SCREEN_CATALOGS} (RDBMS catalogs) and Screen ${SCREEN_DATABASE} (lakehouse database) - ` +
			'lakehouse pattern will take precedence'
		);
	}

	// Check for incomplete lakehouse pattern
	if (screens.includes(SCREEN_DATABASE) && !screens.includes(SCREEN_SCHEMA)) {
		warnings.push(
			`Screen ${SCREEN_DATABASE} (database) present without Screen ${SCREEN_SCHEMA} (schema) - ` +
			'incomplete lakehouse pattern may cause discovery to fail'
		);
	}

	// Check for schema without database in lakehouse pattern
	if (screens.includes(SCREEN_SCHEMA) && !screens.includes(SCREEN_DATABASE) && !screens.includes(SCREEN_CATALOGS)) {
		warnings.push(
			`Screen ${SCREEN_SCHEMA} (schema) present without Screen ${SCREEN_DATABASE} (database) or Screen ${SCREEN_CATALOGS} (catalogs) - ` +
			'schema selection has no parent screen'
		);
	}

	// Check for orphaned artifact screen
	const hasAnySchemaScreen = screens.includes(SCREEN_CATALOGS) ||
		screens.includes(SCREEN_SCHEMA);

	if (screens.includes(SCREEN_ARTIFACTS) && !hasAnySchemaScreen) {
		warnings.push(
			`Screen ${SCREEN_ARTIFACTS} (artifacts) present without schema selection - ` +
			'artifact discovery needs schema context'
		);
	}

	// Check for invalid screen IDs (should be positive integers)
	const invalidScreens = screens.filter(s => !Number.isInteger(s) || s < 1);
	if (invalidScreens.length > 0) {
		errors.push(
			`Invalid screen IDs in pipelineRequiredScreens: ${invalidScreens.join(', ')} ` +
			'(screen IDs must be positive integers)'
		);
	}

	// Check for duplicate screens
	const uniqueScreens = new Set(screens);
	if (uniqueScreens.size < screens.length) {
		warnings.push(
			'pipelineRequiredScreens contains duplicate screen IDs - duplicates will be ignored'
		);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Assert that a connector configuration is valid
 *
 * Throws an error if the configuration is invalid.
 * Use this when you need to guarantee valid configuration.
 *
 * @param config - Connector configuration to validate
 * @throws Error if configuration is invalid
 *
 * @example
 * ```typescript
 * try {
 *     assertValidConfiguration(config);
 *     // Configuration is valid, proceed
 * } catch (error) {
 *     console.error('Invalid configuration:', error.message);
 * }
 * ```
 */
export function assertValidConfiguration(
	config: ConnectorConfiguration
): void {
	const validation = validateConnectorConfiguration(config);

	if (!validation.valid) {
		throw new Error(
			`Invalid connector configuration:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`
		);
	}
}
