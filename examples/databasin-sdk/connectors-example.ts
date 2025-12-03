/**
 * Connectors Client Usage Examples
 *
 * This file demonstrates common usage patterns for the ConnectorsClient.
 * Run with: bun run examples/connectors-example.ts
 */

import { createConnectorsClient } from '../../src/client/connectors.js';

const client = createConnectorsClient();

/**
 * Example 1: Count all connectors (most token-efficient)
 */
async function countAllConnectors() {
	console.log('Example 1: Counting all connectors...');

	const result = await client.list();
	console.log(result); // { count: 434 }

	console.log('\n');
}

/**
 * Example 2: Count connectors for a specific project
 */
async function countProjectConnectors() {
	console.log('Example 2: Counting project connectors...');

	const projectId = 'N1r8Do'; // Replace with your project ID
	const result = await client.list(projectId);
	console.log(`Project ${projectId} has ${result.count} connectors`);

	console.log('\n');
}

/**
 * Example 3: Get limited connector data with specific fields
 */
async function getProjectConnectorsSummary() {
	console.log('Example 3: Getting project connectors summary...');

	const projectId = 'N1r8Do'; // Replace with your project ID
	const connectors = await client.list(projectId, {
		count: false,
		fields: 'connectorID,connectorName,connectorType,status',
		limit: 10
	});

	console.log(`Retrieved ${Array.isArray(connectors) ? connectors.length : 0} connectors`);
	if (Array.isArray(connectors)) {
		connectors.forEach((conn) => {
			console.log(`  - ${conn.connectorName} (${conn.connectorType}): ${conn.status}`);
		});
	}

	console.log('\n');
}

/**
 * Example 4: Get a specific connector
 */
async function getSpecificConnector() {
	console.log('Example 4: Getting specific connector...');

	const connectorId = 'conn-123'; // Replace with actual connector ID
	try {
		const connector = await client.get(connectorId);
		console.log('Connector details:');
		console.log(`  Name: ${connector.connectorName}`);
		console.log(`  Type: ${connector.connectorType}`);
		console.log(`  Status: ${connector.status}`);
		console.log(`  Has configuration: ${!!connector.configuration}`);
	} catch (error) {
		console.error('Error fetching connector:', error);
	}

	console.log('\n');
}

/**
 * Example 5: Create a new database connector
 */
async function createDatabaseConnector() {
	console.log('Example 5: Creating new database connector...');

	try {
		const newConnector = await client.create({
			connectorName: 'My PostgreSQL Database',
			connectorType: 'database',
			internalID: 'N1r8Do', // Replace with your project ID
			status: 'active',
			configuration: {
				host: 'localhost',
				port: 5432,
				database: 'mydb',
				username: 'app_user'
				// Note: In production, use secure credential storage
			}
		});

		console.log('Connector created successfully:');
		console.log(`  ID: ${newConnector.connectorID}`);
		console.log(`  Name: ${newConnector.connectorName}`);
	} catch (error) {
		console.error('Error creating connector:', error);
	}

	console.log('\n');
}

/**
 * Example 6: Update a connector
 */
async function updateConnector() {
	console.log('Example 6: Updating connector...');

	const connectorId = 'conn-123'; // Replace with actual connector ID
	try {
		const updated = await client.update(connectorId, {
			connectorName: 'Updated Connector Name',
			status: 'inactive'
		});

		console.log('Connector updated successfully:');
		console.log(`  New name: ${updated.connectorName}`);
		console.log(`  New status: ${updated.status}`);
	} catch (error) {
		console.error('Error updating connector:', error);
	}

	console.log('\n');
}

/**
 * Example 7: Get system connector configuration
 */
async function getSystemConfig() {
	console.log('Example 7: Getting system connector configuration...');

	try {
		// Get limited fields to reduce token usage
		const config = await client.getConfig({
			fields: 'hostingEnvironment,sourceConnectors,targetConnectors'
		});

		console.log('System configuration:');
		console.log(`  Hosting environment: ${config.hostingEnvironment}`);
		console.log(`  Source connector types: ${config.sourceConnectors?.length || 0}`);
		console.log(`  Target connector types: ${config.targetConnectors?.length || 0}`);
	} catch (error) {
		console.error('Error fetching system config:', error);
	}

	console.log('\n');
}

/**
 * Example 8: Delete a connector (use with caution!)
 */
async function deleteConnector() {
	console.log('Example 8: Deleting connector...');

	const connectorId = 'conn-123'; // Replace with actual connector ID
	try {
		await client.delete(connectorId);
		console.log('Connector deleted successfully');
	} catch (error) {
		console.error('Error deleting connector:', error);
	}

	console.log('\n');
}

/**
 * Example 9: Token efficiency comparison
 */
async function demonstrateTokenEfficiency() {
	console.log('Example 9: Token efficiency comparison...');

	const projectId = 'N1r8Do';

	console.log('Most efficient (count only):');
	const countOnly = await client.list(projectId);
	console.log(`  Result: ${JSON.stringify(countOnly)}`);
	console.log('  Approximate tokens: ~50');

	console.log('\nModerate (specific fields, limited):');
	const limited = await client.list(projectId, {
		count: false,
		fields: 'connectorID,connectorName,status',
		limit: 5
	});
	console.log(`  Result: ${Array.isArray(limited) ? limited.length : 0} items`);
	console.log('  Approximate tokens: ~500-1000');

	console.log('\n⚠️ AVOID: Full data for all connectors');
	console.log('  Would consume: ~200,000+ tokens!');
	console.log('  Always use count, fields, or limit options');

	console.log('\n');
}

/**
 * Run all examples
 */
async function main() {
	console.log('='.repeat(60));
	console.log('DataBasin Connectors Client Examples');
	console.log('='.repeat(60));
	console.log('\n');

	try {
		// Basic operations
		await countAllConnectors();
		await countProjectConnectors();
		await getProjectConnectorsSummary();

		// Detailed operations
		// await getSpecificConnector();
		// await createDatabaseConnector();
		// await updateConnector();
		// await deleteConnector();

		// System operations
		// await getSystemConfig();

		// Best practices
		await demonstrateTokenEfficiency();

		console.log('All examples completed successfully!');
	} catch (error) {
		console.error('Error running examples:', error);
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.main) {
	main();
}
