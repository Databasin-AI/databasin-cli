/**
 * Databasin SDK - Usage Metrics Client Example
 *
 * Demonstrates how to use the UsageMetricsClient to fetch and analyze
 * usage statistics for users, projects, and institutions.
 *
 * @example
 * ```bash
 * # Set your API token
 * export DATABASIN_TOKEN="your-token-here"
 *
 * # Run the example
 * bun run examples/databasin-sdk/usage-metrics-example.ts
 * ```
 */

import { createUsageMetricsClient } from '../../src/client/index.ts';
import type { UsageSummary } from '../../src/types/api.ts';

async function main() {
	console.log('=== Databasin Usage Metrics Client Example ===\n');

	// Create a usage metrics client
	const client = createUsageMetricsClient();

	try {
		// Example 1: Get current user's usage
		console.log('1. Fetching current user usage...');
		const myUsage = await client.getMyUsage();
		console.log('My Usage Summary:');
		displayUsage(myUsage);
		console.log();

		// Example 2: Get all user usage (requires admin)
		console.log('2. Fetching all user usage...');
		try {
			const allUsers = await client.getAllUserUsage();
			console.log(`Total users: ${allUsers.length}`);
			
			// Find top 3 users by pipeline executions
			const topUsers = allUsers
				.sort((a, b) => (b.pipelinesRun || 0) - (a.pipelinesRun || 0))
				.slice(0, 3);
			
			console.log('\nTop 3 users by pipeline executions:');
			topUsers.forEach((user, idx) => {
				console.log(`  ${idx + 1}. ${user.name}: ${user.pipelinesRun} pipelines`);
			});
		} catch (error) {
			console.log('  (Requires admin permissions)');
		}
		console.log();

		// Example 3: Get all project usage
		console.log('3. Fetching all project usage...');
		const projects = await client.getAllProjectUsage();
		console.log(`Total projects: ${projects.length}`);
		
		if (projects.length > 0) {
			// Calculate total records processed across all projects
			const totalRecords = projects.reduce(
				(sum, p) => sum + (p.recordsProcessed || 0),
				0
			);
			console.log(`Total records processed: ${totalRecords.toLocaleString()}`);

			// Calculate total compute time
			const totalCompute = projects.reduce(
				(sum, p) => sum + (p.computeMinutes || 0),
				0
			);
			console.log(`Total compute time: ${totalCompute.toLocaleString()} minutes`);

			// Find project with highest activity
			const mostActive = projects.reduce((max, p) => 
				(p.pipelinesRun || 0) > (max.pipelinesRun || 0) ? p : max
			);
			console.log(`\nMost active project: ${mostActive.name} (${mostActive.pipelinesRun} pipelines)`);
		}
		console.log();

		// Example 4: Get specific project usage
		if (projects.length > 0 && projects[0].id) {
			console.log('4. Fetching specific project usage...');
			const projectUsage = await client.getProjectUsage(projects[0].id);
			console.log(`Project: ${projectUsage.name}`);
			displayUsage(projectUsage);
			console.log();
		}

		// Example 5: Analyze resource consumption
		console.log('5. Analyzing resource consumption...');
		if (projects.length > 0) {
			const resourceUsage = projects.map(p => ({
				name: p.name || 'Unknown',
				compute: p.computeMinutes || 0,
				storage: p.storageGB || 0,
				ratio: (p.computeMinutes || 0) / Math.max(p.storageGB || 1, 1)
			}));

			// Sort by compute time
			const byCompute = [...resourceUsage].sort((a, b) => b.compute - a.compute);
			console.log('\nTop 3 by compute time:');
			byCompute.slice(0, 3).forEach((p, idx) => {
				console.log(`  ${idx + 1}. ${p.name}: ${p.compute.toLocaleString()} min`);
			});

			// Sort by storage
			const byStorage = [...resourceUsage].sort((a, b) => b.storage - a.storage);
			console.log('\nTop 3 by storage:');
			byStorage.slice(0, 3).forEach((p, idx) => {
				console.log(`  ${idx + 1}. ${p.name}: ${p.storage.toLocaleString()} GB`);
			});
		}
		console.log();

		// Example 6: Time-based analysis
		console.log('6. Time-based analysis...');
		const recentProjects = projects.filter(p => {
			if (!p.lastActivity) return false;
			const lastActivity = new Date(p.lastActivity);
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			return lastActivity > thirtyDaysAgo;
		});
		console.log(`Projects active in last 30 days: ${recentProjects.length}`);

		if (recentProjects.length > 0) {
			const avgPipelines = recentProjects.reduce(
				(sum, p) => sum + (p.pipelinesRun || 0),
				0
			) / recentProjects.length;
			console.log(`Average pipelines per active project: ${avgPipelines.toFixed(2)}`);
		}

	} catch (error) {
		console.error('Error fetching usage metrics:', error);
		if (error instanceof Error) {
			console.error('Error details:', error.message);
		}
	}
}

/**
 * Display usage summary in a readable format
 */
function displayUsage(usage: UsageSummary): void {
	console.log(`  ID: ${usage.id || 'N/A'}`);
	console.log(`  Name: ${usage.name || 'N/A'}`);
	console.log(`  Type: ${usage.entityType || 'N/A'}`);
	
	if (usage.pipelinesRun !== undefined) {
		console.log(`  Pipelines Run: ${usage.pipelinesRun}`);
	}
	
	if (usage.automationsRun !== undefined) {
		console.log(`  Automations Run: ${usage.automationsRun}`);
	}
	
	if (usage.sqlQueriesExecuted !== undefined) {
		console.log(`  SQL Queries: ${usage.sqlQueriesExecuted}`);
	}
	
	if (usage.recordsProcessed !== undefined) {
		console.log(`  Records Processed: ${usage.recordsProcessed.toLocaleString()}`);
	}
	
	if (usage.computeMinutes !== undefined) {
		console.log(`  Compute Time: ${usage.computeMinutes.toLocaleString()} minutes`);
	}
	
	if (usage.storageGB !== undefined) {
		console.log(`  Storage Used: ${usage.storageGB.toLocaleString()} GB`);
	}
	
	if (usage.lastActivity) {
		console.log(`  Last Activity: ${new Date(usage.lastActivity).toLocaleString()}`);
	}
}

// Run the example
main().catch(console.error);
