# DataBasin API Client

Production-ready HTTP client for DataBasin API with automatic authentication, token refresh, error handling, and token efficiency features.

## Available Clients

### Base Client (`base.ts`)

Core HTTP client that all resource clients extend.

### Resource Clients

- **PipelinesClient** (`pipelines.ts`) - Full CRUD + run operations for pipelines
- **ProjectsClient** (`projects.ts`) - Project management operations
- **ConnectorsClient** (`connectors.ts`) - Connector management operations
- **AutomationsClient** (`automations.ts`) - Automation scheduling operations
- **SqlClient** (`sql.ts`) - SQL query execution operations

### Quick Start - Resource Clients

```typescript
import { createPipelinesClient } from './client/pipelines.ts';

const client = createPipelinesClient();

// List pipelines (projectId REQUIRED)
const pipelines = await client.list('N1r8Do');

// Get specific pipeline
const pipeline = await client.get('123');

// Create pipeline
const newPipeline = await client.create({
 pipelineName: 'My Pipeline',
 sourceConnectorId: 'mysql-prod',
 targetConnectorId: 'snowflake-dw'
});

// Update pipeline
await client.update('123', { enabled: true });

// Run pipeline
const result = await client.run('123');

// Delete pipeline
await client.delete('123');
```

See [Pipelines Client Documentation](../../docs/pipelines-guide.md) for complete reference.

## Features

- **Automatic Token Management**: Loads JWT from environment or file, injects into all requests
- **Token Refresh**: Auto-retry on 401 with fresh token
- **Error Handling**: Typed errors (ApiError, NetworkError, AuthError, ValidationError)
- **Token Efficiency**: Count-only, field filtering, and limit options to reduce payload size
- **Type Safety**: Full TypeScript generics for request/response types
- **Debug Logging**: Optional request/response logging to stderr
- **Retry Logic**: Configurable retry for network failures
- **Timeout Support**: Automatic request timeout with AbortController
- **Client-side Validation**: Validates required parameters before API calls

## Quick Start

```typescript
import { createClient } from './client/base.ts';
import type { Project } from './types/api.ts';

// Create client (uses config from ~/.databasin/config.json + env vars)
const client = createClient();

// Simple GET request
const projects = await client.get<Project[]>('/api/my/projects');

// POST with body
const newProject = await client.post('/api/project', {
 name: 'My Project',
 organizationId: 123
});

// PUT to update
await client.put('/api/project/1', { name: 'Updated Name' });

// DELETE
await client.delete('/api/project/1');
```

## Token Efficiency

Reduce response payload size for large datasets:

```typescript
// Count only (returns { count: 42 })
const count = await client.get('/api/my/projects', { count: true });

// Limit results
const recent = await client.get('/api/my/projects', { limit: 10 });

// Field filtering
const names = await client.get('/api/my/projects', {
 fields: 'id,name,internalID'
});
```

## Error Handling

All errors are typed for easy handling:

```typescript
import { ApiError, NetworkError, AuthError } from './utils/errors.ts';

try {
 const projects = await client.get('/api/my/projects');
} catch (error) {
 if (error instanceof ApiError) {
  console.error(`API Error ${error.statusCode}: ${error.message}`);
  console.error(`Endpoint: ${error.endpoint}`);
  console.error(`Suggestion: ${error.suggestion}`);
 } else if (error instanceof NetworkError) {
  console.error(`Network Error: ${error.message}`);
  console.error(`URL: ${error.url}`);
 } else if (error instanceof AuthError) {
  console.error(`Auth Error: ${error.message}`);
  console.error(`Suggestion: ${error.suggestion}`);
 }
}
```

## Query Parameters

Pass query parameters as an object:

```typescript
const projects = await client.get('/api/my/projects', {
 params: {
  page: 1,
  limit: 20,
  search: 'demo'
 }
});
// Calls: /api/my/projects?page=1&limit=20&search=demo
```

## Custom Configuration

Override config for specific requests:

```typescript
// Debug logging for this request
const data = await client.get('/api/endpoint', { debug: true });

// Custom timeout (5 seconds)
const data = await client.get('/api/slow-endpoint', { timeout: 5000 });

// Retry on network failure
const data = await client.get('/api/endpoint', {
 retries: 2,
 retryDelay: 1000
});

// Custom headers
const data = await client.get('/api/endpoint', {
 headers: {
  'X-Custom-Header': 'value'
 }
});

// Skip authentication (public endpoints)
const data = await client.get('/api/public', { skipAuth: true });
```

## Configuration Priority

The client uses configuration with this priority (highest to lowest):

1. **Request options** (passed to get/post/put/delete)
2. **Constructor config** (passed to `new DataBasinClient()`)
3. **Environment variables** (DATABASIN_API_URL, etc.)
4. **Config file** (~/.databasin/config.json)
5. **Default values**

## Token Loading Priority

JWT tokens are loaded from these sources (highest to lowest):

1. **DATABASIN_TOKEN** environment variable
2. **.token** file in current directory (project-specific)
3. **~/.databasin/.token** file (user-wide)

## Debug Logging

Enable debug logging to see request/response details:

```typescript
// Via config
const client = createClient({ debug: true });

// Via environment variable
process.env.DATABASIN_DEBUG = 'true';

// Via request option
await client.get('/api/endpoint', { debug: true });
```

Debug output goes to **stderr** to avoid interfering with JSON output on stdout.

## Utility Methods

```typescript
// Check API connectivity
const isOnline = await client.ping();

// Change base URL
client.setBaseUrl('https://api.staging.databasin.ai');

// Get current base URL
const url = client.getBaseUrl();

// Clear cached token (force reload)
client.clearToken();
```

## Error Recovery

The client automatically handles common error scenarios:

### 401 Unauthorized

Automatically refreshes token from disk/env and retries **once**:

```typescript
// First request gets 401 → loads fresh token → retries → succeeds
const projects = await client.get('/api/my/projects');
```

### Network Failures

Optionally retry on network errors (not 4xx/5xx):

```typescript
// Retry up to 2 times with 1 second delay
const data = await client.get('/api/endpoint', {
 retries: 2,
 retryDelay: 1000
});
```

### Timeout

Requests timeout after configured duration (default: 30s):

```typescript
// Override timeout for specific request
const data = await client.get('/api/slow-endpoint', {
 timeout: 60000 // 60 seconds
});
```

## TypeScript Generics

Use generics for full type safety:

```typescript
import type { Project, Pipeline, Connector } from './types/api.ts';

// Type-safe GET
const projects = await client.get<Project[]>('/api/my/projects');
const project = await client.get<Project>('/api/project/123');

// Type-safe POST
const newPipeline = await client.post<Pipeline>('/api/pipeline', {
 pipelineName: 'My Pipeline',
 sourceConnectorId: 'source-123',
 targetConnectorId: 'target-456'
});

// Type-safe PUT
const updated = await client.put<Connector>('/api/connector/123', {
 connectorName: 'Updated Name'
});
```

## Advanced Patterns

### Conditional Token Efficiency

```typescript
const isLarge = await client.get('/api/my/projects', { count: true });

if (isLarge.count > 100) {
 // Large dataset - use pagination or limit
 const page1 = await client.get('/api/my/projects', {
  params: { page: 0, limit: 50 }
 });
} else {
 // Small dataset - fetch all
 const all = await client.get('/api/my/projects');
}
```

### Multiple Environments

```typescript
// Production client
const prodClient = createClient({
 apiUrl: 'https://api.databasin.ai'
});

// Staging client
const stagingClient = createClient({
 apiUrl: 'https://api.staging.databasin.ai'
});

// Local development
const devClient = createClient({
 apiUrl: 'http://localhost:9000'
});
```

### Custom Error Handling

```typescript
function handleApiError(error: unknown): never {
 if (error instanceof ApiError) {
  if (error.statusCode === 404) {
   console.error('Resource not found');
  } else if (error.statusCode >= 500) {
   console.error('Server error - please try again later');
  }
 }

 throw error;
}

try {
 const data = await client.get('/api/endpoint');
} catch (error) {
 handleApiError(error);
}
```

## Testing

The client is designed for easy testing with mock fetch:

```typescript
import { mock } from 'bun:test';

// Mock fetch
global.fetch = mock(() =>
 Promise.resolve({
  ok: true,
  status: 200,
  json: async () => ({ success: true })
 })
);

// Test your code
const client = createClient();
const result = await client.get('/api/test');
```

## Performance

The client is optimized for:

- **Minimal overhead**: Direct fetch API usage, no heavy dependencies
- **Token caching**: Token loaded once and cached in memory
- **Lazy loading**: Token only loaded when first request is made
- **Smart retries**: Only retry network failures, not client/server errors
- **Efficient JSON**: Streaming JSON parsing where available

## Architecture

The client follows patterns from the DataBasin plugin skills:

- **Base class pattern**: All API clients can extend DataBasinClient
- **Token efficiency**: Matches plugin skill patterns for reducing token usage
- **Error handling**: Consistent error types across CLI and plugins
- **Configuration**: Same config system as plugin skills

## Related Files

- `src/cli/src/types/api.ts` - API response types
- `src/cli/src/utils/errors.ts` - Error classes
- `src/cli/src/utils/auth.ts` - Token management
- `src/cli/src/config.ts` - Configuration management

## References

- [DataBasin API Plugin Skill](.claude-plugin/plugins/databasin/skills/databasin-api/)
- [Token Efficiency Guide](.claude-plugin/plugins/databasin/skills/databasin-api/references/token-efficiency.md)
- [Working Endpoints](.claude-plugin/plugins/databasin/skills/databasin-api/references/working-endpoints.md)
