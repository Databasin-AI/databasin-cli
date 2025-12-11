/**
 * Demo script for DatabasinClient
 *
 * Tests basic functionality and shows usage examples.
 */

import { createClient } from '../../src/client/base.ts';
import { loadConfig } from '../../src/config.ts';
import type { Project } from '../../src/types/api.ts';

// Mock token for demo
// In production, use: databasin login
process.env.DATABASIN_TOKEN = 'demo-jwt-token';

async function demo() {
	console.log('Databasin API Client Demo\n');

	// Create client with custom config
	const config = loadConfig({
		apiUrl: 'https://api.test.databasin.ai',
		debug: true,
		timeout: 5000
	});
	const client = createClient(config);

	console.log('Base URL:', client.getBaseUrl());
	console.log('');

	// Example 1: Check connectivity
	console.log('Example 1: Check API connectivity');
	try {
		const isOnline = await client.ping();
		console.log('API is online:', isOnline);
	} catch (error) {
		console.log('Ping failed (expected in demo):', error);
	}
	console.log('');

	// Example 2: Type-safe GET request
	console.log('Example 2: Type-safe GET request');
	try {
		const projects = await client.get<Project[]>('/api/my/projects');
		console.log('Projects:', projects);
	} catch (error) {
		console.log('Request failed (expected in demo):', error);
	}
	console.log('');

	// Example 3: Token efficiency - count
	console.log('Example 3: Count-only request');
	try {
		const count = await client.get('/api/my/projects', { count: true });
		console.log('Project count:', count);
	} catch (error) {
		console.log('Request failed (expected in demo):', error);
	}
	console.log('');

	// Example 4: Token efficiency - fields
	console.log('Example 4: Field filtering');
	try {
		const projectNames = await client.get('/api/my/projects', {
			fields: 'id,name,internalID'
		});
		console.log('Project names:', projectNames);
	} catch (error) {
		console.log('Request failed (expected in demo):', error);
	}
	console.log('');

	// Example 5: POST request
	console.log('Example 5: POST request');
	try {
		const newProject = await client.post('/api/project', {
			name: 'Demo Project',
			organizationId: 123
		});
		console.log('Created project:', newProject);
	} catch (error) {
		console.log('Request failed (expected in demo):', error);
	}
	console.log('');

	console.log('Demo completed!');
	console.log('\nNote: All requests failed because we are using a demo token.');
	console.log('In production, authenticate with: databasin login');
}

// Run demo if executed directly
if (import.meta.main) {
	demo().catch(console.error);
}
