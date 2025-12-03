/**
 * Discovery Pattern Types for DataBasin CLI
 *
 * Defines types for connector discovery workflows (schema/catalog selection).
 * Based on the two discovery patterns used by DataBasin:
 * 1. RDBMS-style: Single-level schema discovery (Screen 1)
 * 2. Lakehouse-style: Two-level catalog→schema discovery (Screens 6→7)
 *
 * @see docs/DISCOVERY-WORKFLOW-GUIDE.md
 * @module types/discovery
 */

/**
 * Discovery pattern types supported by DataBasin
 *
 * - `lakehouse`: Two-phase discovery (database/catalog → schema)
 *   - Used by: Postgres, MSSQL, Databricks, Snowflake
 *   - Screens: [6, 7, 2, 3, 4, 5]
 *   - APIs: /api/v2/connector/catalogs → /api/v2/connector/schemas
 *
 * - `rdbms`: Single-phase discovery (schema only)
 *   - Used by: MySQL, Oracle, MariaDB, DB2
 *   - Screens: [1, 2, 3, 4, 5]
 *   - API: /api/connector/catalogs (with schemas embedded)
 *
 * - `none`: No discovery needed (e.g., API connectors, file sources)
 *   - Screens do not include 1, 6, or 7
 */
export type DiscoveryPattern = 'lakehouse' | 'rdbms' | 'none';

/**
 * Complete discovery flow information for a connector
 *
 * Aggregates all discovery-related metadata for a connector configuration.
 * Use this to understand the full discovery workflow required.
 *
 * @example
 * ```typescript
 * const postgresFlow: DiscoveryFlow = {
 *   pattern: 'lakehouse',
 *   requiresDatabase: true,
 *   requiresSchema: true,
 *   screens: [6, 7]
 * };
 *
 * const mysqlFlow: DiscoveryFlow = {
 *   pattern: 'rdbms',
 *   requiresDatabase: false,
 *   requiresSchema: true,
 *   screens: [1]
 * };
 * ```
 */
export interface DiscoveryFlow {
	/** Discovery pattern type */
	pattern: DiscoveryPattern;

	/** Whether connector requires database/catalog selection (Screen 6) */
	requiresDatabase: boolean;

	/** Whether connector requires schema selection (Screen 1 or 7) */
	requiresSchema: boolean;

	/** Ordered list of screen IDs used for discovery */
	screens: number[];
}

/**
 * Validation result for connector configuration
 *
 * Result of validating a connector's discovery configuration.
 * Use this to catch configuration errors before runtime.
 *
 * @example
 * ```typescript
 * const validation = validateConnectorConfiguration(config);
 *
 * if (!validation.valid) {
 *   console.error('Configuration errors:', validation.errors);
 * }
 *
 * if (validation.warnings.length > 0) {
 *   validation.warnings.forEach(w => console.warn(w));
 * }
 * ```
 */
export interface ValidationResult {
	/** Whether the configuration is valid */
	valid: boolean;

	/** Critical errors that prevent operation */
	errors: string[];

	/** Warnings about potential issues */
	warnings: string[];
}
