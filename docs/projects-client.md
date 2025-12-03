# Projects Client Documentation

The `ProjectsClient` provides comprehensive access to DataBasin project-related endpoints. It extends `DataBasinClient` with automatic authentication, error handling, and token efficiency support.

## Installation

```typescript
import { ProjectsClient, createProjectsClient } from './client/projects.ts';
```

## Quick Start

```typescript
// Create client instance
const client = new ProjectsClient();
// or
const client = createProjectsClient();

// List all projects
const projects = await client.list();

// Get specific project
const project = await client.get('N1r8Do');

// Get current user info
const user = await client.getCurrentUser();
```

## API Reference

### Methods

#### `list(options?)`

List all accessible projects for the current user.

**Parameters:**

- `options?: TokenEfficiencyOptions & RequestOptions`
  - `count?: boolean` - Return only count instead of full data
  - `fields?: string` - Comma-separated field names to return
  - `limit?: number` - Maximum number of items to return
  - `timeout?: number` - Request timeout in ms
  - `debug?: boolean` - Enable debug logging

**Returns:** `Promise<Project[] | { count: number }>`

**Examples:**

```typescript
// Get all projects
const projects = await client.list();

// Count only
const count = await client.list({ count: true });
// Returns: { count: 42 }

// Limited results
const recent = await client.list({ limit: 5 });

// Specific fields only
const names = await client.list({
	fields: 'id,name,internalID,organizationName'
});

// Combined options
const topFive = await client.list({
	fields: 'id,name',
	limit: 5
});
```

---

#### `get(id, options?)`

Get specific project details by ID or internal ID.

**Parameters:**

- `id: string` - Project ID (numeric) or internal ID (e.g., "N1r8Do")
- `options?: RequestOptions` - Request options

**Returns:** `Promise<Project>`

**Examples:**

```typescript
// By internal ID
const project = await client.get('N1r8Do');

// By numeric ID
const project = await client.get('123');

// With debug logging
const project = await client.get('N1r8Do', { debug: true });
```

---

#### `listOrganizations(options?)`

List all accessible organizations for the current user.

**Parameters:**

- `options?: TokenEfficiencyOptions & RequestOptions` - Same as `list()`

**Returns:** `Promise<Organization[] | { count: number }>`

**Examples:**

```typescript
// Get all organizations
const orgs = await client.listOrganizations();

// Count only
const count = await client.listOrganizations({ count: true });

// Specific fields
const orgNames = await client.listOrganizations({
	fields: 'id,name,shortName'
});
```

---

#### `getCurrentUser(options?)`

Get authenticated user's account information.

**Parameters:**

- `options?: RequestOptions` - Request options

**Returns:** `Promise<User>`

**Examples:**

```typescript
const user = await client.getCurrentUser();
console.log(`Logged in as: ${user.firstName} ${user.lastName}`);
console.log(`Email: ${user.email}`);
console.log(`Organizations: ${user.organizationMemberships?.length || 0}`);
console.log(`Projects: ${user.projectMemberships?.length || 0}`);
```

---

#### `getProjectUsers(projectId, options?)`

Get all users with access to a specific project.

**Parameters:**

- `projectId: string` - Project ID (numeric) or internal ID
- `options?: TokenEfficiencyOptions & RequestOptions` - Same as `list()`

**Returns:** `Promise<User[] | { count: number }>`

**Examples:**

```typescript
// Get all project users
const users = await client.getProjectUsers('N1r8Do');

// Count only
const userCount = await client.getProjectUsers('N1r8Do', {
	count: true
});

// Specific fields
const userEmails = await client.getProjectUsers('N1r8Do', {
	fields: 'id,email,firstName,lastName'
});
```

---

#### `getProjectStats(projectId, options?)`

Get aggregated statistics for a project.

**Parameters:**

- `projectId: string` - Project ID (numeric) or internal ID
- `options?: RequestOptions` - Request options

**Returns:** `Promise<ProjectStats>`

**Examples:**

```typescript
const stats = await client.getProjectStats('N1r8Do');
console.log(`Connectors: ${stats.connectorCount || 0}`);
console.log(`Pipelines: ${stats.pipelineCount || 0}`);
console.log(`Automations: ${stats.automationCount || 0}`);
```

---

## Type Definitions

### Project

```typescript
interface Project {
	id: number;
	internalID: string;
	name: string;
	description?: string;
	organizationId: number;
	organizationName?: string;
	administratorId?: number;
	createdDate: string;
	deleted: boolean;
	favorited?: boolean;
}
```

### Organization

```typescript
interface Organization {
	id: number;
	name: string;
	shortName?: string;
	description?: string;
	createdDate: string;
	enabled?: boolean;
	deleted?: boolean;
	administrator?: User;
	projects?: ProjectMembership[];
	modifiedAt?: string;
}
```

### User

```typescript
interface User {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	enabled?: boolean;
	roles?: string[];
	organizationMemberships?: OrganizationMembership[];
	projectMemberships?: ProjectMembership[];
}
```

### ProjectStats

```typescript
interface ProjectStats {
	connectorCount?: number;
	pipelineCount?: number;
	automationCount?: number;
	[key: string]: number | undefined;
}
```

---

## Token Efficiency

The Projects client supports token efficiency options to reduce response payload size:

### Count Mode

Return only the count of items instead of full data:

```typescript
const { count } = await client.list({ count: true });
console.log(`You have ${count} projects`);
```

### Field Filtering

Return only specific fields from objects:

```typescript
const projects = await client.list({
	fields: 'id,name,internalID'
});
// Each project will only have id, name, and internalID properties
```

### Limit

Truncate arrays to specified length:

```typescript
const recent = await client.list({ limit: 10 });
// Returns only first 10 projects
```

### Combined Options

Combine multiple efficiency options:

```typescript
const simplified = await client.list({
	fields: 'id,name',
	limit: 5
});
// Returns 5 projects with only id and name fields
```

---

## Error Handling

The client automatically handles errors and provides typed error objects:

```typescript
import { ApiError, NetworkError } from '../utils/errors.ts';

try {
	const project = await client.get('invalid-id');
} catch (error) {
	if (error instanceof ApiError) {
		console.error(`API Error ${error.status}: ${error.message}`);
		console.error(`Endpoint: ${error.endpoint}`);
		console.error(`Details: ${error.details}`);
	} else if (error instanceof NetworkError) {
		console.error(`Network Error: ${error.message}`);
		console.error(`URL: ${error.url}`);
	} else {
		console.error('Unknown error:', error);
	}
}
```

---

## Authentication

The client automatically:

- Loads JWT token from configured sources (env, file, etc.)
- Injects token in Authorization header
- Refreshes token on 401 responses
- Retries request once with new token

No manual token management required.

---

## Configuration

Client respects global CLI configuration:

```typescript
import { loadConfig } from '../config.ts';

// Load custom config
const config = loadConfig({ debug: true, timeout: 60000 });

// Create client with config
const client = new ProjectsClient(config);
```

---

## Testing

Run the test suite:

```bash
cd /home/founder3/code/tpi/databasin-sv/src/cli
bun run test/projects-client.test.ts
```

Test output shows all 6 methods working correctly with token efficiency features.

---

## See Also

- [Base Client Documentation](./base-client.md)
- [API Types Reference](../src/types/api.ts)
- [DataBasin API Reference](../../../.claude-plugin/plugins/databasin/skills/databasin-api/references/working-endpoints.md)
