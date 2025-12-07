# Automations Client Documentation

The `AutomationsClient` provides comprehensive access to Databasin automation-related endpoints. It extends `DatabasinClient` with automatic authentication, error handling, and token efficiency support.

## Installation

```typescript
import { AutomationsClient, createAutomationsClient } from './client/automations.ts';
```

## Quick Start

```typescript
// Create client instance
const client = new AutomationsClient();
// or
const client = createAutomationsClient();

// List automations in a project
const automations = await client.list('proj-123');

// Get specific automation
const automation = await client.get('auto-456');

// Run an automation
const result = await client.run('auto-456');

// Get automation history
const history = await client.getAutomationHistory('auto-456');
```

## API Reference

### Methods

#### `list(projectId, options?)`

List automations in a specific project.

**Parameters:**

- `projectId: string` - Project ID (numeric or internal ID)
- `options?: TokenEfficiencyOptions & RequestOptions`
  - `count?: boolean` - Return only count instead of full data
  - `fields?: string` - Comma-separated field names to return
  - `limit?: number` - Maximum number of items to return
  - `active?: boolean` - Filter to active automations only
  - `running?: boolean` - Filter to running automations only
  - `timeout?: number` - Request timeout in ms
  - `debug?: boolean` - Enable debug logging

**Returns:** `Promise<Automation[] | { count: number }>`

**Examples:**

```typescript
// Get all automations in project
const automations = await client.list('proj-123');

// Count only
const count = await client.list('proj-123', { count: true });
// Returns: { count: 15 }

// Limited results
const recent = await client.list('proj-123', { limit: 5 });

// Specific fields only
const basic = await client.list('proj-123', {
	fields: 'automationID,name,status'
});

// Active automations only
const active = await client.list('proj-123', {
	active: true
});

// Running automations
const running = await client.list('proj-123', {
	running: true
});

// Combined options
const optimized = await client.list('proj-123', {
	fields: 'automationID,name',
	limit: 10,
	active: true
});
```

---

#### `get(id, options?)`

Get specific automation details by ID.

**Parameters:**

- `id: string` - Automation ID
- `options?: RequestOptions` - Request options

**Returns:** `Promise<Automation>`

**Examples:**

```typescript
// Get automation details
const automation = await client.get('auto-456');

// With specific fields
const basic = await client.get('auto-456', {
	fields: 'automationID,name,status,schedule'
});

// With debug logging
const automation = await client.get('auto-456', { debug: true });
```

---

#### `create(config, options?)`

Create a new automation.

**Parameters:**

- `config: AutomationCreateRequest` - Automation configuration
- `options?: RequestOptions` - Request options

**Returns:** `Promise<Automation>`

**Examples:**

```typescript
// Create automation
const newAuto = await client.create({
	name: 'Nightly ETL',
	projectId: 'proj-123',
	enabled: true,
	schedule: '0 2 * * *',
	tasks: [
		{
			name: 'Extract Data',
			type: 'pipeline',
			config: { pipelineId: 'pipeline-456' }
		}
	]
});
```

---

#### `update(id, config, options?)`

Update an existing automation.

**Parameters:**

- `id: string` - Automation ID
- `config: AutomationUpdateRequest` - Updated configuration
- `options?: RequestOptions` - Request options

**Returns:** `Promise<Automation>`

**Examples:**

```typescript
// Update automation
const updated = await client.update('auto-456', {
	name: 'Updated Name',
	enabled: false,
	schedule: '0 3 * * *'
});
```

---

#### `delete(id, options?)`

Delete an automation.

**Parameters:**

- `id: string` - Automation ID
- `options?: RequestOptions` - Request options

**Returns:** `Promise<void>`

**Examples:**

```typescript
// Delete automation
await client.delete('auto-456');
```

---

#### `run(id, options?)`

Execute an automation immediately.

**Parameters:**

- `id: string` - Automation ID
- `options?: RequestOptions` - Request options

**Returns:** `Promise<AutomationRunResult>`

**Examples:**

```typescript
// Run automation
const result = await client.run('auto-456');
console.log(`Automation running with job ID: ${result.jobId}`);
```

---

#### `stop(id, options?)`

Stop a running automation.

**Parameters:**

- `id: string` - Automation ID
- `options?: RequestOptions` - Request options

**Returns:** `Promise<void>`

**Examples:**

```typescript
// Stop automation
await client.stop('auto-456');
```

---

#### `getAutomationLogs(automationId, params?, options?)`

Get logs for an automation.

**Parameters:**

- `automationId: string` - Automation ID
- `params?: { currentRunID?: string; limit?: number }` - Parameters
  - `currentRunID`: Run ID (default: "0" for current run)
  - `limit`: Limit number of log entries
- `options?: RequestOptions` - Request options

**Returns:** `Promise<AutomationLogEntry[]>`

**Examples:**

```typescript
// Get current run logs
const logs = await client.getAutomationLogs('auto-456');

// Get specific run logs
const runLogs = await client.getAutomationLogs('auto-456', {
	currentRunID: 'run-123'
});

// Limit entries
const recent = await client.getAutomationLogs('auto-456', {
	limit: 100
});
```

---

#### `getAutomationTaskLogs(taskId, params?, options?)`

Get logs for an automation task.

**Parameters:**

- `taskId: string` - Automation Task ID
- `params?: { currentRunID?: string; limit?: number }` - Parameters
- `options?: RequestOptions` - Request options

**Returns:** `Promise<AutomationTaskLogEntry[]>`

**Examples:**

```typescript
// Get task logs
const logs = await client.getAutomationTaskLogs('task-789');

// Specific run
const runLogs = await client.getAutomationTaskLogs('task-789', {
	currentRunID: 'run-123'
});
```

---

#### `getAutomationHistory(id, options?)`

Get automation execution history.

**Parameters:**

- `id: string` - Automation ID
- `options?: TokenEfficiencyOptions & RequestOptions` - Same as `list()`

**Returns:** `Promise<AutomationHistoryEntry[]>`

**Examples:**

```typescript
// Get all history
const history = await client.getAutomationHistory('auto-456');

// Count only
const count = await client.getAutomationHistory('auto-456', { count: true });

// Recent runs
const recent = await client.getAutomationHistory('auto-456', { limit: 10 });

// Specific fields
const simplified = await client.getAutomationHistory('auto-456', {
	fields: 'timestamp,status,duration'
});
```

---

#### `getAutomationTaskHistory(taskId, options?)`

Get task execution history.

**Parameters:**

- `taskId: string` - Automation Task ID
- `options?: TokenEfficiencyOptions & RequestOptions` - Same as `list()`

**Returns:** `Promise<AutomationTaskHistoryEntry[]>`

**Examples:**

```typescript
// Get task history
const history = await client.getAutomationTaskHistory('task-789');

// Count only
const count = await client.getAutomationTaskHistory('task-789', { count: true });

// Recent executions
const recent = await client.getAutomationTaskHistory('task-789', { limit: 10 });
```

---

## Type Definitions

### Automation

```typescript
interface Automation {
	automationID: string;
	name: string;
	status: string;
	enabled: boolean;
	projectId: string;
	schedule?: string;
	lastRunDate?: string;
	lastRunStatus?: string;
	createdAt?: string;
	tasks?: AutomationTask[];
	configuration?: Record<string, any>;
}
```

### AutomationLogEntry

```typescript
interface AutomationLogEntry {
	timestamp: string;
	message: string;
	level?: string;
	taskID?: string;
	taskName?: string;
}
```

### AutomationTaskLogEntry

```typescript
interface AutomationTaskLogEntry {
	timestamp: string;
	message: string;
	level?: string;
	taskName?: string;
	taskID?: string;
	taskType?: string;
}
```

### AutomationHistoryEntry

```typescript
interface AutomationHistoryEntry {
	id: string;
	automationID: string;
	timestamp: string;
	status: string;
	duration?: number;
	tasksCompleted?: number;
	tasksFailed?: number;
	triggeredBy?: string;
}
```

### AutomationTaskHistoryEntry

```typescript
interface AutomationTaskHistoryEntry {
	id: string;
	automationTaskID: string;
	timestamp: string;
	status: string;
	taskType?: string;
	duration?: number;
	result?: string;
}
```

---

## Token Efficiency

The Automations client supports token efficiency options to reduce response payload size:

### Count Mode

Return only the count of items instead of full data:

```typescript
const { count } = await client.list('proj-123', { count: true });
console.log(`You have ${count} automations`);
```

### Field Filtering

Return only specific fields from objects:

```typescript
const automations = await client.list('proj-123', {
	fields: 'automationID,name,status'
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
	fields: 'automationID,name',
	limit: 5,
	active: true
});
```

---

## Error Handling

The client automatically handles errors and provides typed error objects:

```typescript
import { ApiError, NetworkError } from '../utils/errors.ts';

try {
	const automation = await client.get('invalid-id');
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
const client = new AutomationsClient(config);
```

---

## See Also

- [Automations Guide](./automations-guide.md) - Complete command reference
- [Automations Quick Start](./automations-quickstart.md) - Quick reference
- [Observability Guide](./observability-guide.md) - Automation history and logs
- [API Types Reference](../src/types/api.ts)
