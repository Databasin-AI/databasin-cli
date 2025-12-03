/**
 * Pipelines Client Usage Examples
 *
 * Comprehensive examples demonstrating all features of the PipelinesClient.
 * Run individual functions to see different usage patterns.
 *
 * Prerequisites:
 * - Valid authentication token in ~/.databasin/token or DATABASIN_TOKEN env var
 * - Access to a DataBasin project
 * - API URL configured (defaults to production)
 *
 * Usage:
 * ```bash
 * bun run examples/pipelines-example.ts
 * ```
 */

import { createPipelinesClient } from '../../src/client/pipelines.js';
import type { Pipeline, PipelineData } from '../../src/client/pipelines.js';

// Example project ID - replace with your actual project ID
const PROJECT_ID = 'N1r8Do';

/**
 * Example 1: List all pipelines in a project
 *
 * The list() method REQUIRES a projectId parameter.
 * This is the most basic usage pattern.
 */
async function example1_listPipelines() {
	console.log('\n=== Example 1: List All Pipelines ===\n');

	const client = createPipelinesClient();

	try {
		const pipelines = await client.list(PROJECT_ID);
		console.log(`Found ${pipelines.length} pipelines:`);

		pipelines.forEach((pipeline: Pipeline) => {
			console.log(`  - ${pipeline.pipelineName} (${pipeline.pipelineID})`);
			console.log(`    Status: ${pipeline.status}, Enabled: ${pipeline.enabled}`);
		});
	} catch (error) {
		console.error('Error listing pipelines:', error);
	}
}

/**
 * Example 2: Token efficiency - count only
 *
 * Use count option to get total count without downloading full data.
 * Saves bandwidth and improves performance.
 */
async function example2_countPipelines() {
	console.log('\n=== Example 2: Count Pipelines ===\n');

	const client = createPipelinesClient();

	try {
		const result = await client.list(PROJECT_ID, { count: true });
		console.log(`Total pipelines in project: ${result.count}`);
	} catch (error) {
		console.error('Error counting pipelines:', error);
	}
}

/**
 * Example 3: Token efficiency - specific fields
 *
 * Request only the fields you need to reduce payload size.
 * Useful for large result sets where you only need a few fields.
 */
async function example3_specificFields() {
	console.log('\n=== Example 3: Specific Fields Only ===\n');

	const client = createPipelinesClient();

	try {
		const pipelines = await client.list(PROJECT_ID, {
			fields: 'pipelineID,pipelineName,status'
		});

		console.log('Pipelines (ID, Name, Status only):');
		pipelines.forEach((pipeline: any) => {
			console.log(`  ${pipeline.pipelineID}: ${pipeline.pipelineName} [${pipeline.status}]`);
		});
	} catch (error) {
		console.error('Error getting pipelines:', error);
	}
}

/**
 * Example 4: Limit results
 *
 * Get only the first N results to reduce payload size.
 * Useful for "recent items" or preview scenarios.
 */
async function example4_limitResults() {
	console.log('\n=== Example 4: Limit Results ===\n');

	const client = createPipelinesClient();

	try {
		const pipelines = await client.list(PROJECT_ID, { limit: 5 });
		console.log(`First 5 pipelines:`);

		pipelines.forEach((pipeline: Pipeline) => {
			console.log(`  - ${pipeline.pipelineName}`);
		});
	} catch (error) {
		console.error('Error getting pipelines:', error);
	}
}

/**
 * Example 5: Filter by status
 *
 * Get only pipelines with a specific status.
 */
async function example5_filterByStatus() {
	console.log('\n=== Example 5: Filter by Status ===\n');

	const client = createPipelinesClient();

	try {
		const activePipelines = await client.list(PROJECT_ID, {
			status: 'active'
		});

		console.log(`Active pipelines: ${activePipelines.length}`);
		activePipelines.forEach((pipeline: Pipeline) => {
			console.log(`  - ${pipeline.pipelineName}`);
		});
	} catch (error) {
		console.error('Error filtering pipelines:', error);
	}
}

/**
 * Example 6: Get specific pipeline
 *
 * Retrieve full details for a single pipeline by ID.
 */
async function example6_getPipeline() {
	console.log('\n=== Example 6: Get Specific Pipeline ===\n');

	const client = createPipelinesClient();

	try {
		// First get a list to find an ID
		const pipelines = await client.list(PROJECT_ID, { limit: 1 });

		if (pipelines.length === 0) {
			console.log('No pipelines found in project');
			return;
		}

		const pipelineId = pipelines[0].pipelineID.toString();
		const pipeline = await client.get(pipelineId);

		console.log('Pipeline details:');
		console.log(`  ID: ${pipeline.pipelineID}`);
		console.log(`  Name: ${pipeline.pipelineName}`);
		console.log(`  Status: ${pipeline.status}`);
		console.log(`  Enabled: ${pipeline.enabled}`);
		console.log(`  Source: ${pipeline.sourceConnectorId || 'N/A'}`);
		console.log(`  Target: ${pipeline.targetConnectorId || 'N/A'}`);
		console.log(`  Artifacts: ${pipeline.artifacts?.length || 0}`);
	} catch (error) {
		console.error('Error getting pipeline:', error);
	}
}

/**
 * Example 7: Create a new pipeline
 *
 * Create a pipeline with basic configuration.
 */
async function example7_createPipeline() {
	console.log('\n=== Example 7: Create Pipeline ===\n');

	const client = createPipelinesClient();

	const pipelineData: PipelineData = {
		pipelineName: 'Example Pipeline - Created via CLI',
		sourceConnectorId: 'example-source',
		targetConnectorId: 'example-target',
		enabled: false, // Start disabled
		configuration: {
			description: 'Pipeline created via CLI example',
			schedule: '0 2 * * *' // 2 AM daily
		}
	};

	try {
		const newPipeline = await client.create(pipelineData);

		console.log('Pipeline created successfully:');
		console.log(`  ID: ${newPipeline.pipelineID}`);
		console.log(`  Name: ${newPipeline.pipelineName}`);
		console.log(`  Status: ${newPipeline.status}`);
	} catch (error) {
		console.error('Error creating pipeline:', error);
	}
}

/**
 * Example 8: Update a pipeline
 *
 * Update specific fields of an existing pipeline.
 */
async function example8_updatePipeline() {
	console.log('\n=== Example 8: Update Pipeline ===\n');

	const client = createPipelinesClient();

	try {
		// Get a pipeline to update
		const pipelines = await client.list(PROJECT_ID, { limit: 1 });

		if (pipelines.length === 0) {
			console.log('No pipelines found to update');
			return;
		}

		const pipelineId = pipelines[0].pipelineID.toString();

		// Update the pipeline
		const updates: PipelineData = {
			pipelineName: pipelines[0].pipelineName + ' (Updated)',
			enabled: true
		};

		const updated = await client.update(pipelineId, updates);

		console.log('Pipeline updated successfully:');
		console.log(`  ID: ${updated.pipelineID}`);
		console.log(`  Name: ${updated.pipelineName}`);
		console.log(`  Enabled: ${updated.enabled}`);
	} catch (error) {
		console.error('Error updating pipeline:', error);
	}
}

/**
 * Example 9: Run a pipeline
 *
 * Execute a pipeline and get the job ID for tracking.
 */
async function example9_runPipeline() {
	console.log('\n=== Example 9: Run Pipeline ===\n');

	const client = createPipelinesClient();

	try {
		// Get an enabled pipeline to run
		const pipelines = await client.list(PROJECT_ID, {
			enabled: true,
			limit: 1
		});

		if (pipelines.length === 0) {
			console.log('No enabled pipelines found to run');
			return;
		}

		const pipelineId = pipelines[0].pipelineID.toString();
		console.log(`Executing pipeline: ${pipelines[0].pipelineName}`);

		const result = await client.run(pipelineId);

		console.log('Pipeline execution started:');
		console.log(`  Status: ${result.status}`);
		if (result.jobId) {
			console.log(`  Job ID: ${result.jobId}`);
		}
		if (result.message) {
			console.log(`  Message: ${result.message}`);
		}
	} catch (error) {
		console.error('Error running pipeline:', error);
	}
}

/**
 * Example 10: Delete a pipeline
 *
 * WARNING: This permanently deletes a pipeline!
 * Uncomment the actual delete call to test.
 */
async function example10_deletePipeline() {
	console.log('\n=== Example 10: Delete Pipeline ===\n');

	const client = createPipelinesClient();

	try {
		// First create a test pipeline to delete
		const testPipeline = await client.create({
			pipelineName: 'Test Pipeline - Will be deleted',
			enabled: false
		});

		console.log(`Created test pipeline: ${testPipeline.pipelineID}`);

		// WARNING: Uncomment to actually delete
		// await client.delete(testPipeline.pipelineID.toString());
		// console.log('Pipeline deleted successfully');

		console.log('(Skipped actual deletion - uncomment code to test)');
	} catch (error) {
		console.error('Error in delete example:', error);
	}
}

/**
 * Example 11: Error handling
 *
 * Demonstrates proper error handling for common scenarios.
 */
async function example11_errorHandling() {
	console.log('\n=== Example 11: Error Handling ===\n');

	const client = createPipelinesClient();

	// Example: Missing projectId
	console.log('Test 1: Missing projectId');
	try {
		// @ts-expect-error - intentionally missing parameter
		await client.list();
		console.log('  ERROR: Should have thrown!');
	} catch (error) {
		console.log(`  ✓ Caught ValidationError: ${error.message}`);
	}

	// Example: Empty projectId
	console.log('\nTest 2: Empty projectId');
	try {
		await client.list('');
		console.log('  ERROR: Should have thrown!');
	} catch (error) {
		console.log(`  ✓ Caught ValidationError: ${error.message}`);
	}

	// Example: Invalid pipeline ID (404)
	console.log('\nTest 3: Non-existent pipeline');
	try {
		await client.get('999999999');
		console.log('  ERROR: Should have thrown!');
	} catch (error) {
		console.log(`  ✓ Caught ApiError: ${error.message}`);
	}

	// Example: Missing required field
	console.log('\nTest 4: Create without required field');
	try {
		// @ts-expect-error - intentionally invalid data
		await client.create({});
		console.log('  ERROR: Should have thrown!');
	} catch (error) {
		console.log(`  ✓ Caught ValidationError: ${error.message}`);
	}
}

/**
 * Main runner - execute all examples
 */
async function runAllExamples() {
	console.log('╔══════════════════════════════════════════════════════════════╗');
	console.log('║         DataBasin Pipelines Client - Usage Examples          ║');
	console.log('╚══════════════════════════════════════════════════════════════╝');

	// List of all example functions
	const examples = [
		example1_listPipelines,
		example2_countPipelines,
		example3_specificFields,
		example4_limitResults,
		example5_filterByStatus,
		example6_getPipeline,
		// example7_createPipeline,     // Uncomment to test creation
		// example8_updatePipeline,     // Uncomment to test updates
		// example9_runPipeline,        // Uncomment to test execution
		// example10_deletePipeline,    // Uncomment to test deletion
		example11_errorHandling
	];

	// Run each example
	for (const exampleFn of examples) {
		try {
			await exampleFn();
		} catch (error) {
			console.error(`\nUnhandled error in ${exampleFn.name}:`, error);
		}
	}

	console.log('\n✓ All examples completed\n');
}

// Run examples if this file is executed directly
if (import.meta.main) {
	await runAllExamples();
}
