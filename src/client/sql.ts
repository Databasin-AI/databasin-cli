/**
 * SQL Client for DataBasin CLI
 *
 * Provides comprehensive SQL and schema operations including:
 * - Schema hierarchy navigation (catalogs → schemas → tables → columns)
 * - SQL query execution via warehouse proxy
 * - Schema context retrieval for LLM operations
 *
 * This is the most complex client due to warehouse proxying and hierarchical
 * schema structures in lakehouse connectors (Trino, Databricks).
 *
 * Based on working endpoints documentation:
 * @see .claude-plugin/plugins/databasin/skills/databasin-api/references/working-endpoints.md (lines 473-672)
 *
 * @module client/sql
 */

import { DataBasinClient } from './base.ts';
import type { QueryResult, ColumnInfo, CatalogsResponse, SchemasResponse } from '../types/api.ts';
import type { RequestOptions } from './base.ts';
import chalk from 'chalk';
import { logger } from '../utils/debug.ts';

/**
 * Catalog information for lakehouse connectors
 *
 * Represents the top level of schema hierarchy.
 * Typical catalogs: "hive", "lakehouse", "hubspot"
 */
export interface Catalog {
	/** Catalog name */
	name: string;
}

/**
 * Schema information within a catalog
 *
 * Second level of schema hierarchy.
 * Typical schemas: "default", "analytics", "staging"
 */
export interface Schema {
	/** Schema name */
	name: string;

	/** Optional catalog this schema belongs to */
	catalog?: string;
}

/**
 * Table information within a schema
 *
 * Third level of schema hierarchy.
 */
export interface Table {
	/** Table name */
	name: string;

	/** Table type (TABLE, VIEW, EXTERNAL_TABLE, etc.) */
	type: string;

	/** Optional schema this table belongs to */
	schema?: string;

	/** Optional catalog this table belongs to */
	catalog?: string;
}

/**
 * Column information for a table
 *
 * Extends base ColumnInfo with optional schema context.
 */
export interface Column extends ColumnInfo {
	/** Optional table this column belongs to */
	table?: string;

	/** Optional schema this table belongs to */
	schema?: string;

	/** Optional catalog this table belongs to */
	catalog?: string;
}

/**
 * Complete schema context for a connector
 *
 * Provides full hierarchical structure of catalogs → schemas → tables.
 * Used by LLM for SQL generation with complete schema awareness.
 */
export interface SchemaContext {
	/** Array of catalogs with nested schemas and tables */
	catalogs: {
		/** Catalog name */
		name: string;

		/** Schemas within this catalog */
		schemas: {
			/** Schema name */
			name: string;

			/** Table names within this schema */
			tables: string[];
		}[];
	}[];
}

/**
 * Ingestion recommendation for a table
 *
 * Provides AI-generated recommendations for optimal ingestion strategy
 * based on table structure, primary keys, and change tracking capabilities.
 *
 * Note: The API returns different property names than expected.
 * This interface supports both naming conventions for compatibility.
 */
export interface IngestionRecommendation {
	/** Table name (legacy property name) */
	table?: string;

	/** Table name (API property name) */
	sourceTableName?: string;

	/** Recommended ingestion type (legacy property name) */
	recommendedType?: 'cdc' | 'delta' | 'historical' | 'snapshot' | 'stored_procedure';

	/** Ingestion type (API property name) */
	ingestionType?: 'cdc' | 'delta' | 'historical' | 'snapshot' | 'stored_procedure';

	/** Confidence score (0-100) */
	confidence?: number;

	/** Primary key columns (legacy property name) */
	primaryKeys?: string[];

	/** Merge columns (API property name) */
	mergeColumns?: string[];

	/** Timestamp column for incremental (legacy property name) */
	timestampColumn?: string;

	/** Watermark column for incremental (API property name) */
	watermarkColumnName?: string | null;

	/** Whether CDC is supported */
	cdcSupported?: boolean;

	/** Explanation of recommendation */
	reason?: string;

	/** Target schema name */
	targetSchemaName?: string;

	/** Target table name */
	targetTableName?: string;

	/** Source schema name */
	sourceSchemaName?: string;

	/** Source file name */
	sourceFileName?: string;

	/** Backload number of days */
	backloadNumDays?: number;

	/** Snapshot retention period */
	snapshotRetentionPeriod?: number;

	/** Source file format */
	sourceFileFormat?: string | null;

	/** Source file delimiter */
	sourceFileDelimiter?: string | null;
}

/**
 * SQL Client for DataBasin
 *
 * Extends base client with specialized SQL and schema operations.
 * Handles complex warehouse proxying and schema hierarchy navigation.
 *
 * @example Basic usage
 * ```typescript
 * const client = new SqlClient();
 *
 * // List catalogs
 * const catalogs = await client.listCatalogs('123');
 *
 * // List schemas
 * const schemas = await client.listSchemas('123', 'hive');
 *
 * // Execute query
 * const result = await client.executeQuery('123', 'SELECT * FROM hive.default.users LIMIT 10');
 * ```
 *
 * @example Schema exploration
 * ```typescript
 * const client = new SqlClient();
 *
 * // Get complete schema context
 * const context = await client.getSchemaContext('123');
 *
 * // Navigate hierarchy
 * for (const catalog of context.catalogs) {
 *   console.log(`Catalog: ${catalog.name}`);
 *   for (const schema of catalog.schemas) {
 *     console.log(`  Schema: ${schema.name}`);
 *     console.log(`  Tables: ${schema.tables.join(', ')}`);
 *   }
 * }
 * ```
 */
export class SqlClient extends DataBasinClient {
	/**
	 * List available catalogs for a connector
	 *
	 * Returns top-level catalogs for lakehouse-enabled connectors.
	 * First step in schema hierarchy navigation.
	 *
	 * Endpoint: GET /api/v2/connector/catalogs/:connectorID
	 * Token Usage: ~100-500 tokens (depends on catalog count)
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param options - Request options
	 * @returns Array of catalog names wrapped in Catalog objects
	 *
	 * @example
	 * ```typescript
	 * const catalogs = await client.listCatalogs('123');
	 * // Returns: [{ name: 'hive' }, { name: 'lakehouse' }, { name: 'hubspot' }]
	 * ```
	 */
	async listCatalogs(connectorId: string | number, options?: RequestOptions): Promise<Catalog[]> {
		const response = await this.get<{ catalogs: string[] }>(
			`/api/v2/connector/catalogs/${connectorId}`,
			options
		);

		// Transform string array to Catalog objects
		return response.catalogs.map((name) => ({ name }));
	}

	/**
	 * Get databases/catalogs from connector (lakehouse-style, no schemas)
	 *
	 * Returns database/catalog names WITHOUT embedded schemas. This is the first
	 * step in lakehouse-style two-phase discovery (database → schema).
	 *
	 * Use this for connectors like Postgres, MSSQL, Databricks where users must
	 * select a database/catalog before viewing schemas within it.
	 *
	 * Endpoint: GET /api/v2/connector/catalogs/:id (NOTE: /v2/ prefix!)
	 * Token Usage: ~100-500 tokens (depends on database count)
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param options - Request options
	 * @returns Response with objects array containing database/catalog names
	 *
	 * @example
	 * ```typescript
	 * const response = await client.getCatalogs(5459);
	 * // Returns: {
	 * //   connectorID: 5459,
	 * //   connectorType: 'RDBMS',
	 * //   connectorDatabase: 'postgres',
	 * //   connectorName: 'StarlingPostgres',
	 * //   objects: ['postgres', 'template0', 'template1', 'myapp_db'],
	 * //   connectorTechnology: 'postgres'
	 * // }
	 *
	 * const databases = response.objects; // ['postgres', 'template0', 'template1', 'myapp_db']
	 * ```
	 */
	async getCatalogs(
		connectorId: string | number,
		options?: RequestOptions
	): Promise<CatalogsResponse> {
		logger.debug(`Calling GET /api/v2/connector/catalogs/${connectorId}`);

		const response = await this.get<CatalogsResponse>(
			`/api/v2/connector/catalogs/${connectorId}`,
			options
		);

		logger.debug(`Response type BEFORE stringify: ${typeof response}`);
		logger.debug(`Response is array: ${Array.isArray(response)}`);
		logger.debug(`Response is null: ${response === null}`);
		logger.debug(`Response is undefined: ${response === undefined}`);

		// If it's a string, it's double-encoded JSON - parse it
		let parsedResponse = response;
		if (typeof response === 'string') {
			// Cast to unknown to satisfy TypeScript (API sometimes returns double-encoded JSON)
			const responseStr = response as unknown as string;

			// Check for empty string
			if (responseStr.trim().length === 0) {
				throw new Error('Received empty string response from API. Endpoint may have returned no data.');
			}

			logger.debug(`Response is a string! Parsing JSON...`);
			try {
				parsedResponse = JSON.parse(responseStr) as CatalogsResponse;
				logger.debug(`Parsed response type: ${typeof parsedResponse}`);
				logger.debug(`Parsed objects length: ${parsedResponse.objects?.length || 0}`);
			} catch (error) {
				throw new Error(
					`Double-encoded JSON parsing failed: ${(error as Error).message}. ` +
					`Response preview: ${responseStr.substring(0, 100)}...`
				);
			}

			// Validate parsed structure
			if (typeof parsedResponse !== 'object' || !parsedResponse.objects) {
				throw new Error('Parsed response missing expected "objects" array. Response may be malformed.');
			}
		}

		logger.debug(`Raw response:`, response);
		logger.debug(`Response keys: ${parsedResponse ? Object.keys(parsedResponse).join(', ') : 'null'}`);
		logger.debug(`Received ${parsedResponse.objects?.length || 0} catalogs/databases`);

		return parsedResponse as CatalogsResponse;
	}

	/**
	 * Get schemas for a specific database/catalog (lakehouse-style)
	 *
	 * Returns schema names within a selected database/catalog. This is the second
	 * step in lakehouse-style two-phase discovery (database → schema).
	 *
	 * The catalog parameter specifies which database's schemas to retrieve.
	 *
	 * Endpoint: GET /api/v2/connector/schemas/:id?catalog=X (NOTE: /v2/ prefix!)
	 * Token Usage: ~100-1,000 tokens (depends on schema count)
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param catalog - Database/catalog name (optional for some connectors)
	 * @param options - Request options
	 * @returns Response with objects array containing schema names
	 *
	 * @example Without catalog
	 * ```typescript
	 * const response = await client.getSchemas(5459);
	 * // Returns schemas from default database
	 * ```
	 *
	 * @example With catalog
	 * ```typescript
	 * const response = await client.getSchemas(5459, 'postgres');
	 * // Returns: {
	 * //   schemaCatalogIdentifier: 'postgres',
	 * //   connectorID: 5459,
	 * //   connectorType: 'RDBMS',
	 * //   connectorDatabase: 'postgres',
	 * //   connectorName: 'StarlingPostgres',
	 * //   objects: ['public', 'information_schema', 'pg_catalog'],
	 * //   connectorTechnology: 'postgres'
	 * // }
	 *
	 * const schemas = response.objects; // ['public', 'information_schema', 'pg_catalog']
	 * ```
	 */
	async getSchemas(
		connectorId: string | number,
		catalog?: string,
		options?: RequestOptions
	): Promise<SchemasResponse> {
		const catalogParam = catalog ? `?catalog=${encodeURIComponent(catalog)}` : '';
		const endpoint = `/api/v2/connector/schemas/${connectorId}${catalogParam}`;

		logger.debug(`Calling GET ${endpoint}`);

		const response = await this.get<SchemasResponse>(
			endpoint,
			options
		);

		logger.debug(`Response type BEFORE stringify: ${typeof response}`);

		// If it's a string, it's double-encoded JSON - parse it
		let parsedResponse = response;
		if (typeof response === 'string') {
			// Cast to unknown to satisfy TypeScript (API sometimes returns double-encoded JSON)
			const responseStr = response as unknown as string;

			// Check for empty string
			if (responseStr.trim().length === 0) {
				throw new Error('Received empty string response from API. Endpoint may have returned no data.');
			}

			logger.debug(`Response is a string! Parsing JSON...`);
			try {
				parsedResponse = JSON.parse(responseStr) as SchemasResponse;
				logger.debug(`Parsed response type: ${typeof parsedResponse}`);
				logger.debug(`Parsed objects length: ${parsedResponse.objects?.length || 0}`);
			} catch (error) {
				throw new Error(
					`Double-encoded JSON parsing failed: ${(error as Error).message}. ` +
					`Response preview: ${responseStr.substring(0, 100)}...`
				);
			}

			// Validate parsed structure
			if (typeof parsedResponse !== 'object' || !parsedResponse.objects) {
				throw new Error('Parsed response missing expected "objects" array. Response may be malformed.');
			}
		}

		logger.debug(`Raw response:`, response);
		logger.debug(`Response keys: ${parsedResponse ? Object.keys(parsedResponse).join(', ') : 'null'}`);
		logger.debug(`Received ${parsedResponse.objects?.length || 0} schemas`);
		if (catalog) {
			logger.debug(`Catalog filter: "${catalog}"`);
		}

		return parsedResponse as SchemasResponse;
	}

	/**
	 * Get catalogs with embedded schemas for RDBMS connectors
	 *
	 * This endpoint is specifically designed for RDBMS connectors (postgres, mysql, etc.)
	 * which return schemas directly in the 'objects' array of the catalog response.
	 * Unlike lakehouse connectors that require separate catalog/schema lookups, RDBMS
	 * connectors provide both in a single API call.
	 *
	 * Endpoint: GET /api/connector/catalogs/:connectorID (NOTE: NO /v2/ prefix!)
	 * Token Usage: ~200-1,000 tokens (depends on schema count)
	 *
	 * Response Structure:
	 * - connectorID: Numeric connector identifier
	 * - connectorType: Connector type (e.g., 'postgres', 'mysql')
	 * - connectorDatabase: Database name
	 * - connectorName: User-friendly connector name
	 * - objects: Array of schema names (this is what you want!)
	 * - connectorTechnology: Underlying technology identifier
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param options - Request options
	 * @returns Catalog information with schemas in objects array
	 *
	 * @example
	 * ```typescript
	 * const catalogData = await client.getCatalogsWithSchemas(5459);
	 * // Returns: {
	 * //   connectorID: 5459,
	 * //   connectorType: 'postgres',
	 * //   connectorDatabase: 'starling',
	 * //   connectorName: 'StarlingPostgres',
	 * //   objects: ['public', 'config', 'information_schema'],
	 * //   connectorTechnology: 'postgres'
	 * // }
	 *
	 * // Extract schemas
	 * const schemas = catalogData.objects; // ['public', 'config', 'information_schema']
	 * ```
	 */
	async getCatalogsWithSchemas(
		connectorId: string | number,
		options?: RequestOptions
	): Promise<{
		connectorID: number;
		connectorType: string;
		connectorDatabase: string;
		connectorName: string;
		objects: string[];
		connectorTechnology: string;
	}> {
		return await this.get(
			`/api/connector/catalogs/${connectorId}`,
			options
		);
	}

	/**
	 * List available schemas for a connector
	 *
	 * Returns schemas, optionally filtered by catalog.
	 * Second step in schema hierarchy navigation.
	 *
	 * **NOTE**: For RDBMS connectors (postgres, mysql, etc.), use getCatalogsWithSchemas()
	 * instead, which returns schemas in a single call via the objects array.
	 * This method is primarily for lakehouse connectors that support catalog-filtered
	 * schema lookups.
	 *
	 * Endpoint: GET /api/v2/connector/schemas/:connectorID
	 * Token Usage: ~100-1,000 tokens (depends on schema count)
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param catalog - Optional catalog name to filter schemas
	 * @param options - Request options
	 * @returns Array of schema names wrapped in Schema objects
	 *
	 * @example Without catalog filter
	 * ```typescript
	 * const schemas = await client.listSchemas('123');
	 * // Returns all schemas across all catalogs
	 * ```
	 *
	 * @example With catalog filter
	 * ```typescript
	 * const schemas = await client.listSchemas('123', 'hive');
	 * // Returns: [{ name: 'default', catalog: 'hive' }, { name: 'analytics', catalog: 'hive' }]
	 * ```
	 */
	async listSchemas(
		connectorId: string | number,
		catalog?: string,
		options?: RequestOptions
	): Promise<Schema[]> {
		const params = catalog ? { catalog } : undefined;
		const mergedOptions = { ...options, params: { ...options?.params, ...params } };

		const response = await this.get<{ schemas: string[] }>(
			`/api/v2/connector/schemas/${connectorId}`,
			mergedOptions
		);

		// Transform string array to Schema objects with catalog context
		return response.schemas.map((name) => ({
			name,
			catalog
		}));
	}

	/**
	 * List available tables for a connector
	 *
	 * Returns tables, optionally filtered by catalog and/or schema.
	 * Third step in schema hierarchy navigation.
	 *
	 * Endpoint: GET /api/v2/connector/tables/:connectorID
	 * Token Usage: ~500-5,000 tokens (depends on table count)
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param catalog - Optional catalog name to filter tables
	 * @param schema - Optional schema name to filter tables
	 * @param options - Request options
	 * @returns Array of table metadata with type and context
	 *
	 * @example List all tables
	 * ```typescript
	 * const tables = await client.listTables('123');
	 * // Returns all tables across all catalogs and schemas
	 * ```
	 *
	 * @example List tables in specific schema
	 * ```typescript
	 * const tables = await client.listTables('123', 'hive', 'default');
	 * // Returns: [
	 * //   { name: 'customers', type: 'TABLE', catalog: 'hive', schema: 'default' },
	 * //   { name: 'orders', type: 'TABLE', catalog: 'hive', schema: 'default' }
	 * // ]
	 * ```
	 */
	async listTables(
		connectorId: string | number,
		catalog?: string,
		schema?: string,
		options?: RequestOptions
	): Promise<Table[]> {
		// DEBUG: Log input parameters
		logger.debug('SqlClient.listTables called:', {
			connectorId,
			connectorIdType: typeof connectorId,
			catalog: catalog || 'undefined',
			schema: schema || 'undefined'
		});

		const params: Record<string, string> = {};
		if (catalog) params.catalog = catalog;
		if (schema) params.schema = schema;

		// DEBUG: Log constructed params object
		logger.debug('Constructed params object:', params);
		logger.debug(`Params keys: ${Object.keys(params).join(', ') || '(none)'}`);

		const mergedOptions = {
			...options,
			params: { ...options?.params, ...params }
		};

		// DEBUG: Log final merged options
		logger.debug('Merged options.params:', mergedOptions.params);

		// Tables endpoint returns same structure as catalogs/schemas: { objects: [...] }
		const response = await this.get<{ objects: { name: string; type: string }[] }>(
			`/api/v2/connector/tables/${connectorId}`,
			mergedOptions
		);

		logger.debug(`Response type BEFORE stringify: ${typeof response}`);

		// If it's a string, it's double-encoded JSON - parse it
		let parsedResponse = response;
		if (typeof response === 'string') {
			// Cast to unknown to satisfy TypeScript (API sometimes returns double-encoded JSON)
			const responseStr = response as unknown as string;

			// Check for empty string
			if (responseStr.trim().length === 0) {
				throw new Error('Received empty string response from API. Endpoint may have returned no data.');
			}

			logger.debug(`Response is a string! Parsing JSON...`);
			try {
				parsedResponse = JSON.parse(responseStr) as { objects: { name: string; type: string }[] };
				logger.debug(`Parsed response type: ${typeof parsedResponse}`);
				logger.debug(`Parsed objects length: ${parsedResponse.objects?.length || 0}`);
			} catch (error) {
				throw new Error(
					`Double-encoded JSON parsing failed: ${(error as Error).message}. ` +
					`Response preview: ${responseStr.substring(0, 100)}...`
				);
			}

			// Validate parsed structure
			if (typeof parsedResponse !== 'object' || !parsedResponse.objects) {
				throw new Error('Parsed response missing expected "objects" array. Response may be malformed.');
			}
		}

		logger.debug(`Raw response:`, response);
		logger.debug(`Response has 'objects' property: ${parsedResponse && 'objects' in parsedResponse}`);
		logger.debug(`Objects count: ${parsedResponse.objects?.length || 0}`);

		// Log first object to see structure
		if (parsedResponse.objects && parsedResponse.objects.length > 0) {
			logger.debug(`First object type: ${typeof parsedResponse.objects[0]}`);
			logger.debug(`First object value:`, parsedResponse.objects[0]);
			logger.debug(`First object keys:`, Object.keys(parsedResponse.objects[0] || {}));
		}

		// Transform response to Table objects with context
		// Objects can be either strings (table names) or objects with name/type properties
		return parsedResponse.objects.map((table) => {
			if (typeof table === 'string') {
				// Simple string table name
				return {
					name: table,
					type: 'TABLE',
					catalog,
					schema
				};
			} else {
				// Object with name/type properties
				return {
					name: table.name,
					type: table.type || 'TABLE',
					catalog,
					schema
				};
			}
		});
	}

	/**
	 * Get column information for a table
	 *
	 * Returns detailed column metadata including name, type, and nullability.
	 * Final step in schema hierarchy navigation.
	 *
	 * Endpoint: POST /api/connector/columns
	 * Token Usage: ~500-5,000 tokens (depends on column count)
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param table - Table name
	 * @param schema - Optional schema name (required for most databases)
	 * @param catalog - Optional catalog name
	 * @param options - Request options
	 * @returns Array of column information with type and nullability
	 *
	 * @example
	 * ```typescript
	 * const columns = await client.getColumns('123', 'customers', 'default', 'hive');
	 * // Returns: [
	 * //   { name: 'id', type: 'bigint', nullable: false, table: 'customers', schema: 'default', catalog: 'hive' },
	 * //   { name: 'name', type: 'varchar', nullable: true, table: 'customers', schema: 'default', catalog: 'hive' },
	 * //   { name: 'email', type: 'varchar', nullable: true, table: 'customers', schema: 'default', catalog: 'hive' },
	 * //   { name: 'created_at', type: 'timestamp', nullable: true, table: 'customers', schema: 'default', catalog: 'hive' }
	 * // ]
	 * ```
	 */
	async getColumns(
		connectorId: string | number,
		table: string,
		schema?: string,
		catalog?: string,
		options?: RequestOptions
	): Promise<Column[]> {
		// Build request body
		const body: Record<string, any> = {
			connectorID: typeof connectorId === 'string' ? parseInt(connectorId) : connectorId,
			tableName: table
		};

		// Add schemaCatalog if schema and/or catalog provided
		// Format: "catalog.schema" or just "schema" if no catalog
		if (catalog && schema) {
			body.schemaCatalog = `${catalog}.${schema}`;
		} else if (schema) {
			body.schemaCatalog = schema;
		} else if (catalog) {
			body.schemaCatalog = catalog;
		}

		const response = await this.post<ColumnInfo[]>('/api/connector/columns', body, options);

		// Transform response to Column objects with context
		return response.map((col) => ({
			...col,
			table,
			schema,
			catalog
		}));
	}

	/**
	 * Execute SQL query via warehouse proxy
	 *
	 * Executes SQL queries against Trino/Databricks via DataBasin's connector
	 * query endpoint. Handles warehouse authentication and proxying automatically.
	 *
	 * Endpoint: POST /api/connector/:id/query
	 * Token Usage: ~1,000-30,000+ tokens (depends on result size)
	 *
	 * IMPORTANT: This endpoint was updated from /api/data-warehouse/proxy
	 * to the simpler /api/connector/:id/query which handles warehouse
	 * proxying automatically.
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param query - SQL query to execute
	 * @param options - Request options (timeout recommended for long queries)
	 * @returns Query result with rows, columns, and execution metadata
	 *
	 * @example Simple query
	 * ```typescript
	 * const result = await client.executeQuery('123', 'SELECT * FROM hive.default.users LIMIT 10');
	 * console.log(`${result.rowCount} rows in ${result.executionTime}ms`);
	 * result.rows.forEach(row => console.log(row));
	 * ```
	 *
	 * @example With timeout
	 * ```typescript
	 * const result = await client.executeQuery(
	 *   '123',
	 *   'SELECT COUNT(*) as total FROM large_table',
	 *   { timeout: 60000 } // 60 second timeout
	 * );
	 * ```
	 *
	 * @example Error handling
	 * ```typescript
	 * try {
	 *   const result = await client.executeQuery('123', 'SELECT * FROM invalid_table');
	 * } catch (error) {
	 *   if (error.message.includes('does not exist')) {
	 *     console.error('Table not found');
	 *   }
	 * }
	 * ```
	 */
	async executeQuery(
		connectorId: string | number,
		query: string,
		options?: RequestOptions
	): Promise<QueryResult> {
		const body = { sql: query };
		const response = await this.post<QueryResult>(
			`/api/connector/${connectorId}/query`,
			body,
			options
		);

		// The endpoint returns QueryResult format directly
		// Check for success flag and throw if query failed
		if (!response.success && response.error) {
			throw new Error(response.error);
		}

		return response;
	}

	/**
	 * Get columns for multiple tables in batch
	 *
	 * Retrieves column metadata for multiple tables. For single tables, uses a single
	 * API call. For multiple tables, makes sequential calls to ensure correct table-column
	 * associations since the API returns a flat array without table identification.
	 *
	 * Endpoint: POST /api/connector/columns
	 * Token Usage: ~1,000-10,000 tokens (depends on table count and column count)
	 *
	 * **Implementation Note**: Multi-table requests are executed sequentially (one API call
	 * per table) to maintain accurate table-column mappings. This ensures each column is
	 * correctly associated with its source table.
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param tables - Array of table names
	 * @param schema - Schema name
	 * @param catalog - Optional catalog name
	 * @param options - Request options
	 * @returns Record mapping table name to column array
	 *
	 * @example Single table
	 * ```typescript
	 * const columns = await client.getColumnsBatch(123, ['customers'], 'public');
	 * // Returns: {
	 * //   customers: [{ name: 'id', type: 'bigint', table: 'customers', schema: 'public' }, ...]
	 * // }
	 * ```
	 *
	 * @example Multiple tables (sequential execution)
	 * ```typescript
	 * const columns = await client.getColumnsBatch(
	 *   123,
	 *   ['customers', 'orders', 'products'],
	 *   'public'
	 * );
	 * // Returns: {
	 * //   customers: [{ name: 'id', type: 'bigint', ... }, ...],
	 * //   orders: [{ name: 'id', type: 'bigint', ... }, ...],
	 * //   products: [{ name: 'id', type: 'bigint', ... }, ...]
	 * // }
	 * ```
	 */
	async getColumnsBatch(
		connectorId: number,
		tables: string[],
		schema: string,
		catalog?: string,
		options?: RequestOptions
	): Promise<Record<string, Column[]>> {
		// Validate inputs
		if (connectorId <= 0) {
			throw new Error('Connector ID must be greater than 0');
		}
		if (!tables || tables.length === 0) {
			throw new Error('Tables array must not be empty');
		}
		if (!schema || schema.trim() === '') {
			throw new Error('Schema must not be empty');
		}

		const result: Record<string, Column[]> = {};

		// Initialize empty arrays for each table
		tables.forEach((table) => {
			result[table] = [];
		});

		// For multiple tables, make sequential calls to ensure correct table association
		// The API returns a flat array without table identification, so we need to call
		// it once per table to maintain accurate table-column mappings
		if (tables.length > 1) {
			// Sequential batch: one API call per table
			for (const tableName of tables) {
				const body: Record<string, any> = {
					connectorID: connectorId,
					objects: [tableName], // Single table per request
					chosenDatabaseSchema: schema
				};

				if (catalog) {
					body.catalog = catalog;
				}

				try {
					const response = await this.post<{ columns: ColumnInfo[] }>(
						'/api/connector/columns',
						body,
						options
					);

					if (response.columns && Array.isArray(response.columns)) {
						result[tableName] = response.columns.map((col) => ({
							...col,
							table: tableName,
							schema,
							catalog
						}));
					}
				} catch (error) {
					// Re-throw with table context for better error messages
					throw new Error(
						`Failed to fetch columns for table '${tableName}': ${error instanceof Error ? error.message : String(error)}`
					);
				}
			}
		} else {
			// Single table: use standard batch API call
			const body: Record<string, any> = {
				connectorID: connectorId,
				objects: tables,
				chosenDatabaseSchema: schema
			};

			if (catalog) {
				body.catalog = catalog;
			}

			const response = await this.post<{ columns: ColumnInfo[] }>(
				'/api/connector/columns',
				body,
				options
			);

			if (response.columns && Array.isArray(response.columns)) {
				result[tables[0]] = response.columns.map((col) => ({
					...col,
					table: tables[0],
					schema,
					catalog
				}));
			}
		}

		return result;
	}

	/**
	 * Get ingestion type recommendations for tables
	 *
	 * Analyzes table structure and returns AI-generated recommendations
	 * for optimal ingestion strategy (full, incremental, or CDC).
	 *
	 * Endpoint: POST /api/connector/ingestiontype
	 * Token Usage: ~500-5,000 tokens (depends on table count)
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param tables - Array of table names
	 * @param schema - Schema name
	 * @param catalog - Optional catalog name
	 * @param options - Request options
	 * @returns Array of ingestion recommendations
	 *
	 * @example
	 * ```typescript
	 * const recommendations = await client.getIngestionRecommendations(
	 *   123,
	 *   ['customers', 'orders'],
	 *   'public'
	 * );
	 * // Returns: [
	 * //   {
	 * //     table: 'customers',
	 * //     recommendedType: 'incremental',
	 * //     confidence: 85,
	 * //     timestampColumn: 'updated_at',
	 * //     reason: 'Table has updated_at timestamp column'
	 * //   },
	 * //   {
	 * //     table: 'orders',
	 * //     recommendedType: 'full',
	 * //     confidence: 95,
	 * //     reason: 'No timestamp or primary key detected'
	 * //   }
	 * // ]
	 * ```
	 */
	async getIngestionRecommendations(
		connectorId: number,
		tables: string[],
		schema: string,
		catalog?: string,
		options?: RequestOptions
	): Promise<IngestionRecommendation[]> {
		// Validate inputs
		if (connectorId <= 0) {
			throw new Error('Connector ID must be greater than 0');
		}
		if (!tables || tables.length === 0) {
			throw new Error('Tables array must not be empty');
		}
		if (!schema || schema.trim() === '') {
			throw new Error('Schema must not be empty');
		}

		// Build request payload (same structure as getColumnsBatch)
		const body: Record<string, any> = {
			connectorID: connectorId,
			objects: tables,
			chosenDatabaseSchema: schema
		};

		// Add catalog if provided
		if (catalog) {
			body.catalog = catalog;
		}

		// Call API endpoint (returns same structure as other endpoints: { objects: [...] })
		const response = await this.post<{ objects: IngestionRecommendation[] }>(
			'/api/connector/ingestiontype',
			body,
			options
		);

		logger.debug(`Response type: ${typeof response}`);

		// If it's a string, it's double-encoded JSON - parse it
		let parsedResponse = response;
		if (typeof response === 'string') {
			// Cast to unknown to satisfy TypeScript (API sometimes returns double-encoded JSON)
			const responseStr = response as unknown as string;

			// Check for empty string
			if (responseStr.trim().length === 0) {
				throw new Error('Received empty string response from API. Endpoint may have returned no data.');
			}

			logger.debug(`Response is a string! Parsing JSON...`);
			try {
				parsedResponse = JSON.parse(responseStr) as { objects: IngestionRecommendation[] };
				logger.debug(`Parsed objects length: ${parsedResponse.objects?.length || 0}`);
			} catch (error) {
				throw new Error(
					`Double-encoded JSON parsing failed: ${(error as Error).message}. ` +
					`Response preview: ${responseStr.substring(0, 100)}...`
				);
			}

			// Validate parsed structure
			if (typeof parsedResponse !== 'object' || !parsedResponse.objects) {
				throw new Error('Parsed response missing expected "objects" array. Response may be malformed.');
			}
		}

		// Log first object to see structure
		if (parsedResponse.objects && parsedResponse.objects.length > 0) {
			logger.debug(`First recommendation object type: ${typeof parsedResponse.objects[0]}`);
			logger.debug(`First recommendation object:`, parsedResponse.objects[0]);
			logger.debug(`First recommendation keys:`, Object.keys(parsedResponse.objects[0] || {}));
		}

		// Map response to IngestionRecommendation[]
		if (parsedResponse.objects && Array.isArray(parsedResponse.objects)) {
			return parsedResponse.objects;
		}

		// Return empty array if no recommendations
		return [];
	}

	/**
	 * Get complete schema context for a connector
	 *
	 * Retrieves full hierarchical schema structure in a single call.
	 * Ideal for LLM SQL generation workflows where complete schema
	 * awareness is required.
	 *
	 * Endpoint: GET /api/connector/:connectorID/schema-context
	 * Token Usage: ~2,000-50,000+ tokens (depends on schema size)
	 *
	 * This endpoint is optimized for AI/LLM usage, providing complete
	 * schema context without requiring multiple hierarchy navigation calls.
	 *
	 * @param connectorId - Connector identifier (string or number)
	 * @param options - Request options
	 * @returns Complete schema context with catalogs → schemas → tables hierarchy
	 *
	 * @example
	 * ```typescript
	 * const context = await client.getSchemaContext('123');
	 *
	 * // Navigate full hierarchy
	 * for (const catalog of context.catalogs) {
	 *   console.log(`Catalog: ${catalog.name}`);
	 *
	 *   for (const schema of catalog.schemas) {
	 *     console.log(`  Schema: ${schema.name}`);
	 *     console.log(`    Tables: ${schema.tables.join(', ')}`);
	 *   }
	 * }
	 * ```
	 *
	 * @example Use with LLM for SQL generation
	 * ```typescript
	 * const context = await client.getSchemaContext('123');
	 * const prompt = `Given this schema:\n${JSON.stringify(context, null, 2)}\n\nGenerate SQL for: ${userQuestion}`;
	 * // Pass to LLM...
	 * ```
	 */
	async getSchemaContext(
		connectorId: string | number,
		options?: RequestOptions
	): Promise<SchemaContext> {
		const response = await this.get<SchemaContext>(
			`/api/connector/${connectorId}/schema-context`,
			options
		);

		return response;
	}
}

/**
 * Create a new SQL client instance
 *
 * Factory function for creating configured SQL client instances.
 * Recommended over direct constructor usage for consistency with other clients.
 *
 * @returns Configured SqlClient instance
 *
 * @example
 * ```typescript
 * import { createSqlClient } from './client/sql.ts';
 *
 * const client = createSqlClient();
 * const result = await client.executeQuery('123', 'SELECT * FROM users LIMIT 10');
 * ```
 */
export function createSqlClient(): SqlClient {
	return new SqlClient();
}
