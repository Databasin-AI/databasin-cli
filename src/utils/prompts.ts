/**
 * Interactive Prompt Utilities for DataBasin CLI
 *
 * Provides interactive selection prompts for common CLI operations
 * using the prompts library for better user experience.
 *
 * @module utils/prompts
 *
 * @example
 * ```typescript
 * import { promptForProject } from './prompts';
 *
 * const projectId = await promptForProject(projectsClient, 'Select a project');
 * ```
 */

import prompts from 'prompts';
import chalk from 'chalk';
import type { ProjectsClient } from '../client/projects.ts';
import type { Project } from '../types/api.ts';
import type { SqlClient } from '../client/sql.ts';
import { logger } from './debug.ts';

/**
 * Prompt user to select a project from available projects
 *
 * Fetches list of projects using the client and displays an interactive
 * selection menu. Returns the selected project's internal ID.
 *
 * @param client - ProjectsClient instance
 * @param message - Prompt message to display
 * @returns Selected project internal ID
 * @throws {Error} If no projects available or user cancels
 *
 * @example
 * ```typescript
 * const projectId = await promptForProject(client, 'Select a project');
 * // User selects from list, returns "N1r8Do"
 * ```
 */
export async function promptForProject(
	client: ProjectsClient,
	message: string = 'Select a project'
): Promise<string> {
	// Fetch available projects (get all fields to ensure internalID is included)
	const allProjects = (await client.list()) as Project[];

	// Filter to only projects with valid internalId (required for connector filtering)
	const projects = allProjects.filter(
		(p) => p.internalId && p.internalId !== '-' && p.internalId !== ''
	);

	if (!Array.isArray(projects) || projects.length === 0) {
		throw new Error(
			'No projects available with internal IDs. Projects must have an internal ID to manage connectors.'
		);
	}

	// Create choices array with formatted names
	const choices = projects.map((project) => ({
		title: `${project.name} (${project.internalId})`,
		value: project.internalId
	}));

	// Show interactive select prompt
	const response = await prompts({
		type: 'select',
		name: 'project',
		message,
		choices
	});

	// Handle cancellation
	if (!response.project) {
		throw new Error('Selection cancelled');
	}

	return response.project;
}

/**
 * Prompt user to confirm an action
 *
 * Displays a yes/no confirmation prompt.
 *
 * @param message - Confirmation message
 * @param defaultValue - Default value if user just presses Enter
 * @returns true if confirmed, false otherwise
 *
 * @example
 * ```typescript
 * const confirmed = await promptConfirm('Delete this connector?', false);
 * if (confirmed) {
 *   await client.delete(connectorId);
 * }
 * ```
 */
export async function promptConfirm(
	message: string,
	defaultValue: boolean = true
): Promise<boolean> {
	const response = await prompts({
		type: 'confirm',
		name: 'confirmed',
		message,
		initial: defaultValue
	});

	// Handle cancellation
	if (response.confirmed === undefined) {
		return false;
	}

	return response.confirmed;
}

/**
 * Prompt user for text input
 *
 * Displays an input prompt for single-line text entry.
 *
 * @param message - Input prompt message
 * @param defaultValue - Default value if provided
 * @param validate - Optional validation function
 * @returns User input string
 *
 * @example
 * ```typescript
 * const name = await promptInput('Enter connector name:', '', (val) => {
 *   if (val.length < 3) return 'Name must be at least 3 characters';
 *   return true;
 * });
 * ```
 */
export async function promptInput(
	message: string,
	defaultValue?: string,
	validate?: (value: string) => boolean | string
): Promise<string> {
	const response = await prompts({
		type: 'text',
		name: 'value',
		message,
		initial: defaultValue,
		validate
	});

	// Handle cancellation
	if (!response.value) {
		throw new Error('Input cancelled');
	}

	return response.value;
}

/**
 * Prompt user to select from a list of choices
 *
 * Displays an interactive selection menu.
 *
 * @param message - Prompt message
 * @param choices - Array of choice strings or objects with {title, value}
 * @returns Selected choice
 *
 * @example
 * ```typescript
 * const format = await promptSelect('Select format:', ['table', 'json', 'csv']);
 * ```
 */
export async function promptSelect<T extends string>(
	message: string,
	choices: T[] | Array<{ title: string; value: T }>
): Promise<T> {
	const promptChoices =
		typeof choices[0] === 'object' && choices[0] !== null && 'title' in choices[0]
			? (choices as Array<{ title: string; value: T }>)
			: (choices as T[]).map((c) => ({ title: c, value: c }));

	const response = await prompts({
		type: 'select',
		name: 'selected',
		message,
		choices: promptChoices
	});

	// Handle cancellation
	if (!response.selected) {
		throw new Error('Selection cancelled');
	}

	return response.selected;
}

/**
 * Prompt user to select multiple items from a list
 *
 * Displays a multi-select menu where users can toggle multiple selections.
 *
 * @param message - Prompt message
 * @param choices - Array of choice strings
 * @returns Array of selected choices
 *
 * @example
 * ```typescript
 * const fields = await promptMultiSelect(
 *   'Select fields to display:',
 *   ['id', 'name', 'status', 'createdAt']
 * );
 * // Returns: ['id', 'name', 'status']
 * ```
 */
export async function promptMultiSelect<T extends string>(
	message: string,
	choices: T[]
): Promise<T[]> {
	const promptChoices = choices.map((c) => ({ title: c, value: c }));

	const response = await prompts({
		type: 'multiselect',
		name: 'selected',
		message,
		choices: promptChoices
	});

	// Handle cancellation
	if (!response.selected) {
		return [];
	}

	return response.selected;
}

/**
 * Prompt user to select a catalog from a connector
 *
 * Fetches list of catalogs from a connector and displays an interactive
 * selection menu. Used in schema discovery workflows for lakehouse connectors.
 *
 * @param sqlClient - SQL client instance
 * @param connectorId - Connector ID to fetch catalogs from
 * @param message - Optional custom prompt message
 * @returns Selected catalog name
 * @throws {Error} If no catalogs available or user cancels
 *
 * @example
 * ```typescript
 * const catalog = await promptForCatalog(sqlClient, 123, 'Select catalog');
 * // User selects from list, returns "hive"
 * ```
 */
export async function promptForCatalog(
	sqlClient: SqlClient,
	connectorId: number,
	message?: string
): Promise<string> {
	// Fetch catalogs from connector
	const catalogs = await sqlClient.listCatalogs(connectorId);

	if (!Array.isArray(catalogs) || catalogs.length === 0) {
		throw new Error(`Catalog discovery failed: No catalogs available for connector ${connectorId}. Verify the connector is configured correctly.`);
	}

	// Extract catalog names
	const catalogNames = catalogs.map((c) => c.name);

	// Use promptSelect with catalog names
	const defaultMessage = 'Select catalog';
	return promptSelect(message || defaultMessage, catalogNames);
}

/**
 * Prompt user to select a schema from a connector
 *
 * Fetches list of schemas from a connector and displays an interactive
 * selection menu. Optionally filters by catalog for lakehouse connectors.
 *
 * @param sqlClient - SQL client instance
 * @param connectorId - Connector ID to fetch schemas from
 * @param catalog - Optional catalog filter
 * @param message - Optional custom prompt message
 * @returns Selected schema name
 * @throws {Error} If no schemas available or user cancels
 *
 * @example Without catalog
 * ```typescript
 * const schema = await promptForSchema(sqlClient, 123);
 * // User selects from all schemas
 * ```
 *
 * @example With catalog
 * ```typescript
 * const schema = await promptForSchema(sqlClient, 123, 'hive', 'Select schema');
 * // User selects from schemas in 'hive' catalog
 * ```
 */
export async function promptForSchema(
	sqlClient: SqlClient,
	connectorId: number,
	catalog?: string,
	message?: string
): Promise<string> {
	// Fetch schemas from connector
	const schemas = await sqlClient.listSchemas(connectorId, catalog);

	if (!Array.isArray(schemas) || schemas.length === 0) {
		const catalogContext = catalog ? ` in catalog '${catalog}'` : '';
		throw new Error(`Schema discovery failed: No schemas available${catalogContext} for connector ${connectorId}. Verify the connector has accessible schemas.`);
	}

	// Extract schema names
	const schemaNames = schemas.map((s) => s.name);

	// Use promptSelect with schema names
	const defaultMessage = catalog ? `Select schema from catalog '${catalog}'` : 'Select schema';
	return promptSelect(message || defaultMessage, schemaNames);
}

/**
 * Prompt user to select a database/catalog (lakehouse-style discovery)
 *
 * Fetches database/catalog names from connector using the /v2/ endpoint
 * and displays an interactive selection menu. This is the first step in
 * lakehouse-style two-phase discovery (database → schema).
 *
 * @param sqlClient - SQL client instance
 * @param connectorId - Connector ID to fetch databases from
 * @param message - Optional custom prompt message
 * @returns Selected database/catalog name
 * @throws {Error} If no databases available or user cancels
 *
 * @example
 * ```typescript
 * const database = await promptForDatabase(sqlClient, 5459, 'Select database');
 * // User selects from list, returns "postgres" or "myapp_db"
 * ```
 */
export async function promptForDatabase(
	sqlClient: SqlClient,
	connectorId: number,
	message?: string
): Promise<string> {
	// Fetch databases/catalogs from connector (lakehouse-style)
	const response = await sqlClient.getCatalogs(connectorId);

	if (!Array.isArray(response.objects) || response.objects.length === 0) {
		throw new Error(`Database discovery failed: No databases available for connector ${connectorId}. This lakehouse connector may not have accessible databases.`);
	}

	// Use promptSelect with database names
	const defaultMessage = 'Select database';
	return promptSelect(message || defaultMessage, response.objects);
}

/**
 * Prompt user to select a schema within a catalog (lakehouse-style discovery)
 *
 * Fetches schema names for a specific database/catalog using the /v2/ endpoint
 * and displays an interactive selection menu. This is the second step in
 * lakehouse-style two-phase discovery (database → schema).
 *
 * @param sqlClient - SQL client instance
 * @param connectorId - Connector ID to fetch schemas from
 * @param catalog - Database/catalog name to fetch schemas from
 * @param message - Optional custom prompt message
 * @returns Selected schema name
 * @throws {Error} If no schemas available or user cancels
 *
 * @example
 * ```typescript
 * const schema = await promptForSchemaInCatalog(sqlClient, 5459, 'postgres');
 * // User selects from schemas in 'postgres' database
 * // Returns: 'public' or 'information_schema'
 * ```
 */
export async function promptForSchemaInCatalog(
	sqlClient: SqlClient,
	connectorId: number,
	catalog: string,
	message?: string
): Promise<string> {
	// Fetch schemas for selected catalog (lakehouse-style)
	const response = await sqlClient.getSchemas(connectorId, catalog);

	if (!Array.isArray(response.objects) || response.objects.length === 0) {
		throw new Error(`Schema discovery failed: No schemas available in catalog '${catalog}' for connector ${connectorId}. The selected database may be empty or inaccessible.`);
	}

	// Use promptSelect with schema names
	const defaultMessage = `Select schema from catalog '${catalog}'`;
	return promptSelect(message || defaultMessage, response.objects);
}

/**
 * Prompt user to select tables from a schema
 *
 * Fetches list of tables from a schema and displays an interactive
 * multi-select menu. Allows selecting multiple tables at once.
 *
 * @param sqlClient - SQL client instance
 * @param connectorId - Connector ID to fetch tables from
 * @param schema - Schema name to fetch tables from
 * @param catalog - Optional catalog name
 * @param message - Optional custom prompt message
 * @returns Array of selected table names
 * @throws {Error} If no tables available or user cancels
 *
 * @example Without catalog
 * ```typescript
 * const tables = await promptForTables(sqlClient, 123, 'public');
 * // Returns: ['customers', 'orders', 'products']
 * ```
 *
 * @example With catalog
 * ```typescript
 * const tables = await promptForTables(sqlClient, 123, 'default', 'hive');
 * // Returns: ['users', 'events']
 * ```
 */
export async function promptForTables(
	sqlClient: SqlClient,
	connectorId: number,
	schema: string,
	catalog?: string,
	message?: string
): Promise<string[]> {
	// DEBUG: Log function call parameters
	logger.debug('promptForTables called:', {
		connectorId,
		schema,
		schemaType: typeof schema,
		schemaLength: schema?.length,
		catalog: catalog || 'undefined'
	});

	// Fetch tables from schema
	const tables = await sqlClient.listTables(connectorId, catalog, schema);

	if (!Array.isArray(tables) || tables.length === 0) {
		const catalogContext = catalog ? ` (catalog: '${catalog}')` : '';
		throw new Error(`Table discovery failed: No tables available in schema '${schema}'${catalogContext} for connector ${connectorId}. The schema may be empty or you may lack permissions.`);
	}

	// Format choices with table type
	const choices = tables.map((table) => ({
		title: `${table.name} (${table.type || 'TABLE'})`,
		value: table.name
	}));

	// Use prompts directly for multi-select with formatted choices
	const defaultMessage = 'Select tables (space to select, enter to confirm)';
	const response = await prompts({
		type: 'multiselect',
		name: 'selected',
		message: message || defaultMessage,
		choices
	});

	// Handle cancellation
	if (!response.selected || response.selected.length === 0) {
		return [];
	}

	return response.selected;
}
