/**
 * Projects Client Test
 *
 * Verification script for ProjectsClient implementation.
 * Tests all 6 methods with token efficiency features.
 */

import { ProjectsClient } from '../../src/client/projects.ts';

async function testProjectsClient() {
	console.log('Testing ProjectsClient...\n');

	const client = new ProjectsClient();

	try {
		// Test 1: List all projects
		console.log('1. Testing list()...');
		const projects = await client.list();
		console.log(`   ✓ Found ${Array.isArray(projects) ? projects.length : 0} projects`);

		// Test 2: List with count option
		console.log('\n2. Testing list({ count: true })...');
		const countResult = await client.list({ count: true });
		console.log(`   ✓ Count result:`, countResult);

		// Test 3: List with field filtering
		console.log('\n3. Testing list({ fields: "id,name,internalID" })...');
		const filtered = await client.list({ fields: 'id,name,internalID', limit: 2 });
		console.log(
			`   ✓ Filtered result (first item):`,
			Array.isArray(filtered) ? filtered[0] : filtered
		);

		// Test 4: Get specific project
		if (Array.isArray(projects) && projects.length > 0) {
			const projectId = projects[0].internalID || String(projects[0].id);
			console.log(`\n4. Testing getById('${projectId}')...`);
			const project = await client.getById(projectId);
			console.log(`   ✓ Project: ${project.name}`);
		}

		// Test 5: List organizations
		console.log('\n5. Testing listOrganizations()...');
		const orgs = await client.listOrganizations();
		console.log(`   ✓ Found ${Array.isArray(orgs) ? orgs.length : 0} organizations`);

		// Test 6: Get current user
		console.log('\n6. Testing getCurrentUser()...');
		const user = await client.getCurrentUser();
		console.log(`   ✓ User: ${user.firstName} ${user.lastName} (${user.email})`);

		// Test 7: Get project users
		if (Array.isArray(projects) && projects.length > 0) {
			const projectId = projects[0].internalID || String(projects[0].id);
			console.log(`\n7. Testing getProjectUsers('${projectId}')...`);
			const users = await client.getProjectUsers(projectId);
			console.log(`   ✓ Found ${Array.isArray(users) ? users.length : 0} users`);
		}

		// Test 8: Get project stats
		if (Array.isArray(projects) && projects.length > 0) {
			const projectId = projects[0].internalID || String(projects[0].id);
			console.log(`\n8. Testing getProjectStats('${projectId}')...`);
			const stats = await client.getProjectStats(projectId);
			console.log(`   ✓ Stats:`, stats);
		}

		console.log('\n✓ All tests passed!');
	} catch (error) {
		console.error('\n✗ Test failed:', error);
		process.exit(1);
	}
}

// Run tests
testProjectsClient();
