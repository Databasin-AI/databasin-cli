#!/usr/bin/env bun

/**
 * SQL Client Usage Examples
 *
 * Demonstrates all SQL client capabilities including:
 * - Schema hierarchy navigation
 * - SQL query execution
 * - Schema context retrieval
 * - Error handling patterns
 *
 * Run with: bun run examples/sql-client-usage.ts
 */

import { createSqlClient } from '../../src/client/sql.js';

/**
 * Example 1: Navigate schema hierarchy step-by-step
 */
async function navigateSchemaHierarchy(connectorId: string) {
	console.log('\n📚 Example 1: Navigate Schema Hierarchy\n');

	const client = createSqlClient();

	try {
		// Step 1: List catalogs
		console.log('Step 1: Listing catalogs...');
		const catalogs = await client.listCatalogs(connectorId);
		console.log(
			`Found ${catalogs.length} catalogs:`,
			catalogs.map((c) => c.name)
		);

		if (catalogs.length === 0) {
			console.log('No catalogs found - connector may not support catalog hierarchy');
			return;
		}

		// Step 2: List schemas in first catalog
		const catalog = catalogs[0].name;
		console.log(`\nStep 2: Listing schemas in catalog "${catalog}"...`);
		const schemas = await client.listSchemas(connectorId, catalog);
		console.log(
			`Found ${schemas.length} schemas:`,
			schemas.map((s) => s.name)
		);

		if (schemas.length === 0) {
			console.log('No schemas found in this catalog');
			return;
		}

		// Step 3: List tables in first schema
		const schema = schemas[0].name;
		console.log(`\nStep 3: Listing tables in schema "${catalog}.${schema}"...`);
		const tables = await client.listTables(connectorId, catalog, schema);
		console.log(`Found ${tables.length} tables:`);
		tables.slice(0, 5).forEach((t) => console.log(`  - ${t.name} (${t.type})`));

		if (tables.length === 0) {
			console.log('No tables found in this schema');
			return;
		}

		// Step 4: Get columns for first table
		const table = tables[0].name;
		console.log(`\nStep 4: Getting columns for table "${catalog}.${schema}.${table}"...`);
		const columns = await client.getColumns(connectorId, table, schema, catalog);
		console.log(`Found ${columns.length} columns:`);
		columns.forEach((col) =>
			console.log(`  - ${col.name}: ${col.type}${col.nullable ? ' (nullable)' : ''}`)
		);
	} catch (error: any) {
		console.error('Error navigating schema:', error.message);
	}
}

/**
 * Example 2: Get complete schema context in one call
 */
async function getCompleteSchemaContext(connectorId: string) {
	console.log('\n🗂️  Example 2: Get Complete Schema Context\n');

	const client = createSqlClient();

	try {
		console.log('Fetching complete schema context...');
		const context = await client.getSchemaContext(connectorId);

		console.log(`\nSchema Context for connector ${connectorId}:`);
		console.log(`Found ${context.catalogs.length} catalogs\n`);

		let totalSchemas = 0;
		let totalTables = 0;

		for (const catalog of context.catalogs) {
			console.log(`📁 Catalog: ${catalog.name}`);
			totalSchemas += catalog.schemas.length;

			for (const schema of catalog.schemas.slice(0, 3)) {
				// Show first 3 schemas only
				console.log(`  📂 Schema: ${schema.name}`);
				console.log(
					`     Tables (${schema.tables.length}): ${schema.tables.slice(0, 5).join(', ')}${schema.tables.length > 5 ? '...' : ''}`
				);
				totalTables += schema.tables.length;
			}

			if (catalog.schemas.length > 3) {
				console.log(`  ... and ${catalog.schemas.length - 3} more schemas`);
			}
			console.log();
		}

		console.log(
			`📊 Summary: ${totalSchemas} schemas, ${totalTables} tables across ${context.catalogs.length} catalogs`
		);
	} catch (error: any) {
		console.error('Error fetching schema context:', error.message);
	}
}

/**
 * Example 3: Execute SQL queries
 */
async function executeSqlQueries(connectorId: string) {
	console.log('\n🔍 Example 3: Execute SQL Queries\n');

	const client = createSqlClient();

	try {
		// Simple SELECT query
		console.log('Executing: SELECT * FROM hive.default.users LIMIT 5');
		const result = await client.executeQuery(
			connectorId,
			'SELECT * FROM hive.default.users LIMIT 5'
		);

		if (result.success) {
			console.log(`\n✅ Query successful!`);
			console.log(`Columns: ${result.columns.join(', ')}`);
			console.log(`Rows: ${result.rowCount}`);
			console.log(`Execution time: ${result.executionTime}ms`);
			console.log('\nFirst 3 rows:');
			result.rows.slice(0, 3).forEach((row, idx) => {
				console.log(`  Row ${idx + 1}:`, JSON.stringify(row));
			});
		} else {
			console.error('❌ Query failed:', result.error);
		}

		// Count query
		console.log('\n\nExecuting: SELECT COUNT(*) as total FROM hive.default.users');
		const countResult = await client.executeQuery(
			connectorId,
			'SELECT COUNT(*) as total FROM hive.default.users'
		);

		if (countResult.success && countResult.rows.length > 0) {
			console.log(`✅ Total users: ${countResult.rows[0].total}`);
		}
	} catch (error: any) {
		console.error('Error executing query:', error.message);

		// Provide helpful error messages
		if (error.message.includes('does not exist')) {
			console.log('\n💡 Table not found. Try:');
			console.log('   1. List catalogs: await client.listCatalogs(connectorId)');
			console.log('   2. List schemas: await client.listSchemas(connectorId, catalog)');
			console.log('   3. List tables: await client.listTables(connectorId, catalog, schema)');
		} else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
			console.log('\n💡 Authentication failed. Check your token configuration.');
		}
	}
}

/**
 * Example 4: Build dynamic schema explorer
 */
async function buildSchemaExplorer(connectorId: string) {
	console.log('\n🧭 Example 4: Dynamic Schema Explorer\n');

	const client = createSqlClient();

	try {
		// Get full context
		const context = await client.getSchemaContext(connectorId);

		// Build searchable index
		const index: Array<{ path: string; type: string }> = [];

		for (const catalog of context.catalogs) {
			index.push({ path: catalog.name, type: 'catalog' });

			for (const schema of catalog.schemas) {
				index.push({ path: `${catalog.name}.${schema.name}`, type: 'schema' });

				for (const table of schema.tables) {
					index.push({
						path: `${catalog.name}.${schema.name}.${table}`,
						type: 'table'
					});
				}
			}
		}

		console.log(`Built searchable index with ${index.length} entries`);
		console.log('\nSample entries:');
		index.slice(0, 10).forEach((entry) => {
			console.log(`  ${entry.type.padEnd(8)} ${entry.path}`);
		});

		// Search example
		const searchTerm = 'default';
		console.log(`\n\nSearching for "${searchTerm}"...`);
		const results = index.filter((entry) => entry.path.includes(searchTerm));
		console.log(`Found ${results.length} matches:`);
		results.slice(0, 5).forEach((entry) => {
			console.log(`  ${entry.type.padEnd(8)} ${entry.path}`);
		});
	} catch (error: any) {
		console.error('Error building schema explorer:', error.message);
	}
}

/**
 * Example 5: Token efficiency features
 */
async function demonstrateTokenEfficiency(connectorId: string) {
	console.log('\n⚡ Example 5: Token Efficiency Features\n');

	const client = createSqlClient();

	try {
		// Count only - most efficient
		console.log('Using count mode (most efficient):');
		const countOnly = await client.listTables(connectorId, undefined, undefined, {
			count: true
		});
		console.log('Response:', countOnly);

		// Limit results
		console.log('\nUsing limit (moderate efficiency):');
		const limited = await client.listTables(connectorId, undefined, undefined, { limit: 5 });
		console.log(`Got ${Array.isArray(limited) ? limited.length : 'N/A'} tables (limited to 5)`);

		// Specific fields only
		console.log('\nUsing field filtering:');
		const filtered = await client.listTables(connectorId, undefined, undefined, {
			fields: 'name,type'
		});
		if (Array.isArray(filtered) && filtered.length > 0) {
			console.log('First table (filtered):', filtered[0]);
		}
	} catch (error: any) {
		console.error('Error demonstrating token efficiency:', error.message);
	}
}

/**
 * Main execution
 */
async function main() {
	const args = Bun.argv.slice(2);

	if (args.length === 0 || args[0] === '--help') {
		console.log('SQL Client Usage Examples');
		console.log('\nUsage: bun run examples/sql-client-usage.ts <connectorId> [example]');
		console.log('\nExamples:');
		console.log('  1  - Navigate schema hierarchy step-by-step');
		console.log('  2  - Get complete schema context');
		console.log('  3  - Execute SQL queries');
		console.log('  4  - Build dynamic schema explorer');
		console.log('  5  - Token efficiency features');
		console.log('  all - Run all examples');
		console.log('\nDefault: Runs all examples');
		process.exit(0);
	}

	const connectorId = args[0];
	const example = args[1] || 'all';

	console.log('='.repeat(60));
	console.log('SQL CLIENT USAGE EXAMPLES');
	console.log('='.repeat(60));
	console.log(`Connector ID: ${connectorId}`);

	if (example === 'all' || example === '1') {
		await navigateSchemaHierarchy(connectorId);
	}

	if (example === 'all' || example === '2') {
		await getCompleteSchemaContext(connectorId);
	}

	if (example === 'all' || example === '3') {
		await executeSqlQueries(connectorId);
	}

	if (example === 'all' || example === '4') {
		await buildSchemaExplorer(connectorId);
	}

	if (example === 'all' || example === '5') {
		await demonstrateTokenEfficiency(connectorId);
	}

	console.log('\n' + '='.repeat(60));
	console.log('Examples complete!');
	console.log('='.repeat(60));
}

main().catch((error) => {
	console.error('Fatal error:', error.message);
	process.exit(1);
});
