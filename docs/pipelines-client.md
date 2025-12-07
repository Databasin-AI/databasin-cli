# Pipelines Client Documentation

The `PipelinesClient` provides comprehensive access to Databasin pipeline-related endpoints. It extends `DatabasinClient` with automatic authentication, error handling, and token efficiency support.

## Installation

```typescript
import { PipelinesClient, createPipelinesClient } from './client/pipelines.ts';
```

## Quick Start

```typescript
// Create client instance
const client = new PipelinesClient();
// or
const client = createPipelinesClient();

// List pipelines in a project
const pipelines = await client.list('proj-123');

// Get specific pipeline
const pipeline = await client.get('pipeline-456');

// Run a pipeline
const result = await client.run('pipeline-456');

// Get pipeline history
const history = await client.getPipelineHistory('pipeline-456');
```

## API Reference

### Methods

#### `list(projectId, options?)`

List pipelines in a specific project.

**Parameters:**

- `projectId: string` - Project ID (numeric or internal ID)
- `options?: TokenEfficiencyOptions & RequestOptions`
  - `count?: boolean` - Return only count instead of full data
  - `fields?: string` - Comma-separated field names to return
  - `limit?: number` - Maximum number of items to return
  - `status?: string` - Filter by status (active, inactive, running, error, pending)
  - `timeout?: number` - Request timeout in ms
  - `debug?: boolean` - Enable debug logging

**Returns:** `Promise<Pipeline[] | { count: number }>`

**Examples:**

```typescript
// Get all pipelines in project
const pipelines = await client.list('proj-123');

// Count only
const count = await client.list('proj-123', { count: true });
// Returns: { count: 42 }

// Limited results
const recent = await client.list('proj-123', { limit: 5 });

// Specific fields only
const basic = await client.list('proj-123', {
	fields: 'pipelineID,pipelineName,status'
});

// Filter by status
const active = await client.list('proj-123', {
	status: 'active'
});

// Combined options
const optimized = await client.list('proj-123', {
	fields: 'pipelineID,pipelineName',
	limit: 10,
	status: 'active'
});
```

---

#### `get(id, options?)`

Get specific pipeline details by ID.

**Parameters:**

- `id: string` - Pipeline ID
- `options?: RequestOptions` - Request options

**Returns:** `Promise<Pipeline>`

**Examples:**

```typescript
// Get pipeline details
const pipeline = await client.get('pipeline-456');

// With specific fields
const basic = await client.get('pipeline-456', {
	fields: 'pipelineID,pipelineName,status'
});

// With debug logging
const pipeline = await client.get('pipeline-456', { debug: true });
```

---

#### `create(config, options?)`

Create a new pipeline.

**Parameters:**

- `config: PipelineCreateRequest` - Pipeline configuration
- `options?: RequestOptions` - Request options

**Returns:** `Promise<Pipeline>`

**Examples:**

```typescript
// Create pipeline
const newPipeline = await client.create({
	pipelineName: 'Daily ETL',
	sourceConnectorId: 'conn-123',
	targetConnectorId: 'conn-456',
	enabled: true,
	configuration: {
		schedule: '0 2 * * *'
	}
});
```

---

#### `update(id, config, options?)`

Update an existing pipeline.

**Parameters:**

- `id: string` - Pipeline ID
- `config: PipelineUpdateRequest` - Updated configuration
- `options?: RequestOptions` - Request options

**Returns:** `Promise<Pipeline>`

**Examples:**

```typescript
// Update pipeline
const updated = await client.update('pipeline-456', {
	pipelineName: 'Updated Name',
	enabled: false
});
```

---

#### `delete(id, options?)`

Delete a pipeline.

**Parameters:**

- `id: string` - Pipeline ID
- `options?: RequestOptions` - Request options

**Returns:** `Promise<void>`

**Examples:**

```typescript
// Delete pipeline
await client.delete('pipeline-456');
```

---

#### `run(id, options?)`

Execute a pipeline immediately.

**Parameters:**

- `id: string` - Pipeline ID
- `options?: RequestOptions` - Request options

**Returns:** `Promise<PipelineRunResult>`

**Examples:**

```typescript
// Run pipeline
const result = await client.run('pipeline-456');
console.log(`Pipeline running with job ID: ${result.jobId}`);
```

---

#### `getPipelineHistory(id, options?)`

Get pipeline execution history.

**Parameters:**

- `id: string` - Pipeline ID
- `options?: TokenEfficiencyOptions & RequestOptions` - Same as `list()`

**Returns:** `Promise<PipelineHistoryEntry[]>`

**Examples:**

```typescript
// Get all history
const history = await client.getPipelineHistory('pipeline-456');

// Count only
const count = await client.getPipelineHistory('pipeline-456', { count: true });

// Recent runs
const recent = await client.getPipelineHistory('pipeline-456', { limit: 10 });

// Specific fields
const simplified = await client.getPipelineHistory('pipeline-456', {
	fields: 'timestamp,status,duration'
});
```

---

#### `getArtifactLogs(artifactId, params?, options?)`

Get logs for a pipeline artifact.

**Parameters:**

- `artifactId: string` - Artifact ID
- `params?: { currentRunID?: string; limit?: number }` - Parameters
  - `currentRunID`: Run ID (default: "0" for current run)
  - `limit`: Limit number of log entries
- `options?: RequestOptions` - Request options

**Returns:** `Promise<ArtifactLogEntry[]>`

**Examples:**

```typescript
// Get current run logs
const logs = await client.getArtifactLogs('artifact-789');

// Get specific run logs
const runLogs = await client.getArtifactLogs('artifact-789', {
	currentRunID: 'run-123'
});

// Limit entries
const recent = await client.getArtifactLogs('artifact-789', {
	limit: 50
});
```

---

#### `getArtifactHistory(id, options?)`

Get artifact execution history.

**Parameters:**

- `id: string` - Artifact ID
- `options?: TokenEfficiencyOptions & RequestOptions` - Same as `list()`

**Returns:** `Promise<ArtifactHistoryEntry[]>`

**Examples:**

```typescript
// Get all history
const history = await client.getArtifactHistory('artifact-789');

// Count only
const count = await client.getArtifactHistory('artifact-789', { count: true });

// Recent executions
const recent = await client.getArtifactHistory('artifact-789', { limit: 10 });
```

---

## Type Definitions

### Pipeline

```typescript
interface Pipeline {
	pipelineID: string;
	pipelineName: string;
	status: string;
	enabled: boolean;
	sourceConnectorId?: string;
	targetConnectorId?: string;
	institutionID?: string;
	internalID?: string;
	ownerID?: string;
	lastRunDate?: string;
	createdAt?: string;
	artifacts?: PipelineArtifact[];
	configuration?: Record<string, any>;
}
```

### PipelineHistoryEntry

```typescript
interface PipelineHistoryEntry {
	id: string;
	pipelineID: string;
	timestamp: string;
	status: string;
	duration?: number;
	triggeredBy?: string;
	errorMessage?: string;
}
```

### ArtifactLogEntry

```typescript
interface ArtifactLogEntry {
	timestamp: string;
	message: string;
	level?: string;
	artifactID?: string;
}
```

### ArtifactHistoryEntry

```typescript
interface ArtifactHistoryEntry {
	id: string;
	artifactID: string;
	timestamp: string;
	status: string;
	recordsProcessed?: number;
	errors?: number;
}
```

---

## Token Efficiency

The Pipelines client supports token efficiency options to reduce response payload size:

### Count Mode

Return only the count of items instead of full data:

```typescript
const { count } = await client.list('proj-123', { count: true });
console.log(`You have ${count} pipelines`);
```

### Field Filtering

Return only specific fields from objects:

```typescript
const pipelines = await client.list('proj-123', {
	fields: 'pipelineID,pipelineName,status'
});
```

### Limit

Truncate arrays to specified length:

```typescript
const recent = await client.list('proj-123', { limit: 10 });
```

### Combined Options

Combine multiple efficiency options:

```typescript
const optimized = await client.list('proj-123', {
	fields: 'pipelineID,pipelineName',
	limit: 5,
	status: 'active'
});
```

---

## Error Handling

The client automatically handles errors and provides typed error objects:

```typescript
import { ApiError, NetworkError } from '../utils/errors.ts';

try {
	const pipeline = await client.get('invalid-id');
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
const client = new PipelinesClient(config);
```

---

## See Also

- [Pipelines Guide](./pipelines-guide.md) - Complete command reference
- [Pipelines Quick Start](./pipelines-quickstart.md) - Quick reference
- [Observability Guide](./observability-guide.md) - Pipeline history and logs
- [API Types Reference](../src/types/api.ts)
