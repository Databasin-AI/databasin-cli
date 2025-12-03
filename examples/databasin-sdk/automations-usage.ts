/**
 * Automations Client Usage Examples
 *
 * Demonstrates common patterns for working with the Automations API client.
 */

import { createAutomationsClient } from '../../src/client/automations.js';

async function main() {
	const client = createAutomationsClient();

	console.log('=== Automations Client Usage Examples ===\n');

	// Example 1: List automations for a project
	console.log('1. List all automations for project N1r8Do:');
	const automations = await client.list('N1r8Do');
	console.log(`Found ${automations?.length || 0} automations`);
	console.log();

	// Example 2: Handle null gracefully when no project specified
	console.log('2. List without project (returns null):');
	const noProject = await client.list();
	console.log(`Result: ${noProject}`); // null
	console.log();

	// Example 3: Filter active automations only
	console.log('3. List only active automations:');
	const active = await client.list('N1r8Do', { active: true });
	console.log(`Found ${active?.length || 0} active automations`);
	console.log();

	// Example 4: Get count using token efficiency
	console.log('4. Get count of automations (token efficient):');
	const count = await client.list('N1r8Do', { count: true });
	console.log(`Count: ${JSON.stringify(count)}`);
	console.log();

	// Example 5: Get specific fields only (token efficient)
	console.log('5. Get only names and statuses (token efficient):');
	const summary = await client.list('N1r8Do', {
		fields: 'automationID,automationName,isActive,lastRun'
	});
	console.log(`Summaries: ${JSON.stringify(summary, null, 2)}`);
	console.log();

	// Example 6: Get specific automation
	if (automations && automations.length > 0) {
		const automationId = automations[0].internalID;
		console.log(`6. Get automation details for ${automationId}:`);
		const automation = await client.get(automationId);
		console.log(`Name: ${automation.automationName}`);
		console.log(`Schedule: ${automation.jobRunSchedule}`);
		console.log(`Active: ${automation.isActive}`);
		console.log(`Last run: ${automation.lastRun || 'Never'}`);
		console.log();
	}

	// Example 7: Create new automation
	console.log('7. Create new automation:');
	const newAutomation = await client.create({
		automationName: 'Example ETL Pipeline',
		pipelineId: 'pipeline123',
		jobRunSchedule: '0 2 * * *', // 2 AM daily
		isActive: true,
		jobClusterSize: 'M',
		jobTimeout: '3600'
	});
	console.log(`Created automation: ${newAutomation.internalID}`);
	console.log();

	// Example 8: Update automation
	console.log('8. Update automation (disable):');
	const updated = await client.update(newAutomation.internalID, {
		isActive: false
	});
	console.log(`Automation is now ${updated.isActive ? 'active' : 'inactive'}`);
	console.log();

	// Example 9: Trigger manual run
	console.log('9. Trigger manual automation run:');
	const runResult = await client.run(newAutomation.internalID);
	console.log(`Status: ${runResult.status}`);
	if (runResult.jobId) {
		console.log(`Job ID: ${runResult.jobId}`);
	}
	console.log();

	// Example 10: Delete automation
	console.log('10. Delete automation:');
	await client.delete(newAutomation.internalID);
	console.log('Automation deleted successfully');
	console.log();

	console.log('=== All examples completed successfully ===');
}

// Run examples
if (import.meta.main) {
	main().catch((error) => {
		console.error('Error running examples:', error);
		process.exit(1);
	});
}
