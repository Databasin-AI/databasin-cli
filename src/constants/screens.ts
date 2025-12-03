/**
 * Pipeline wizard screen identifiers
 *
 * These IDs correspond to screens defined in:
 * static/config/pipelines/FlowbasinPipelineScreens.json
 */

/**
 * Screen 1: Catalogs/Schemas (RDBMS-style)
 *
 * Single-level discovery where schemas are returned directly.
 * Used by: MySQL, Oracle, MariaDB, etc.
 * API: GET /api/connector/catalogs/:id
 */
export const SCREEN_CATALOGS = 1;

/**
 * Screen 2: Artifacts (Tables/Views/Objects)
 *
 * Selection of database objects to ingest.
 * API: GET /api/connector/tables/:id?schemaCatalog=:schema
 */
export const SCREEN_ARTIFACTS = 2;

/**
 * Screen 3: Columns
 *
 * Column selection for each artifact.
 * API: POST /api/connector/columns
 */
export const SCREEN_COLUMNS = 3;

/**
 * Screen 4: Data Ingestion Options
 *
 * Configuration of ingestion type and options per artifact.
 * API: POST /api/connector/ingestiontype
 */
export const SCREEN_INGESTION_OPTIONS = 4;

/**
 * Screen 5: Final Configuration
 *
 * Tags, schedule, workload size, and final pipeline settings.
 */
export const SCREEN_FINAL_CONFIGURATION = 5;

/**
 * Screen 6: Database (Lakehouse-style)
 *
 * Database/catalog selection in two-level discovery.
 * Used by: Postgres, MSSQL, Databricks, Snowflake, etc.
 * API: GET /api/v2/connector/catalogs/:id
 */
export const SCREEN_DATABASE = 6;

/**
 * Screen 7: Schema (Lakehouse-style)
 *
 * Schema selection within selected database/catalog.
 * API: GET /api/v2/connector/schemas/:id?catalog=:database
 */
export const SCREEN_SCHEMA = 7;

/**
 * Screen 8: API Configuration
 *
 * Legacy API connector configuration screen.
 */
export const SCREEN_API_CONFIGURATION = 8;

/**
 * Screen 9: API Authentication
 *
 * API authentication configuration screen.
 */
export const SCREEN_API_AUTHENTICATION = 9;

/**
 * Screen 10: Generic API Configuration
 *
 * Generic API endpoint and response handling configuration.
 */
export const SCREEN_GENERIC_API = 10;

/**
 * All discovery-related screen IDs
 *
 * These screens are used to determine the discovery pattern.
 */
export const DISCOVERY_SCREENS = [
	SCREEN_CATALOGS,
	SCREEN_DATABASE,
	SCREEN_SCHEMA
] as const;

/**
 * All pipeline workflow screen IDs
 */
export const ALL_SCREENS = [
	SCREEN_CATALOGS,
	SCREEN_ARTIFACTS,
	SCREEN_COLUMNS,
	SCREEN_INGESTION_OPTIONS,
	SCREEN_FINAL_CONFIGURATION,
	SCREEN_DATABASE,
	SCREEN_SCHEMA,
	SCREEN_API_CONFIGURATION,
	SCREEN_API_AUTHENTICATION,
	SCREEN_GENERIC_API
] as const;
