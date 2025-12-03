# Connectors Client Documentation

**Module:** `client/connectors.ts`
**Status:** ✅ Phase 2 Complete
**Token Safety:** ⚠️ Defaults to count mode

---

## Overview

The Connectors Client manages data source and destination connections within Databasin. It provides methods for CRUD operations on connectors and fetching system connector configuration.

### Critical Token Warning

The `/api/connector` endpoint can return **200,000+ tokens** for all connectors without token efficiency options. This client **DEFAULTS to count mode** for `list()` operations to prevent massive response payloads.

**Always use token efficiency options when fetching full data!**

---

## Quick Start

```typescript
import { createConnectorsClient } from './client/connectors.ts';

const client = createConnectorsClient();

// Count connectors (most efficient - ~50 tokens)
const count = await client.list();
console.log(count); // { count: 434 }

// Get project connectors with limited fields (~500-1000 tokens)
const connectors = await client.list('N1r8Do', {
	count: false,
	fields: 'connectorID,connectorName,connectorType,status',
	limit: 10
});

// Get specific connector
const connector = await client.get('conn-123');
```

---

## API Methods

### `list(projectId?, options?)`

List connectors with token-efficient defaults.

**⚠️ CRITICAL:** Defaults to count mode. Set `count: false` to get full data.

#### Parameters

- `projectId` (optional): Project internal ID to filter connectors (e.g., "N1r8Do")
- `options` (optional): Request and token efficiency options
  - `count` (boolean, default: `true`): Return only count instead of full data
  - `fields` (string): Comma-separated field names to return
  - `limit` (number): Maximum number of items to return
  - Other `RequestOptions` and `TokenEfficiencyOptions`

#### Returns

`Promise<Connector[] | { count: number }>`

#### Examples

```typescript
// Count all connectors (minimal tokens)
const result = await client.list();
// Returns: { count: 434 }

// Count project connectors
const result = await client.list('N1r8Do');
// Returns: { count: 12 }

// Get limited connector data
const connectors = await client.list('N1r8Do', {
	count: false,
	fields: 'connectorID,connectorName,connectorType,status',
	limit: 20
});

// Get full connector data (use sparingly!)
const allConnectors = await client.list('N1r8Do', { count: false });
```

#### Token Usage

| Option                                              | Approx. Tokens |
| --------------------------------------------------- | -------------- |
| Default (count only)                                | ~50            |
| With fields + limit 10                              | ~500-1,000     |
| With fields + limit 50                              | ~2,500-5,000   |
| Full data for 12 connectors                         | ~10,000-20,000 |
| Full data for ALL connectors (⚠️ AVOID!)            | ~200,000+      |

---

### `get(id)`

Get a specific connector by ID.

#### Parameters

- `id` (string): Connector ID (connectorID field)

#### Returns

`Promise<Connector>`

#### Example

```typescript
const connector = await client.get('conn-123');
console.log(connector.connectorName);
console.log(connector.configuration);
```

---

### `create(data)`

Create a new connector.

#### Parameters

- `data` (Partial\<Connector\>): Connector data
  - `connectorName` (required): Human-readable connector name
  - `connectorType` (required): Type category (database, app, file & api, etc.)
  - `internalID` (required): Project internal ID
  - `configuration` (required): Connector configuration object
  - `status` (optional): Connector status (default: 'active')

#### Returns

`Promise<Connector>`

#### Examples

```typescript
// Create a database connector
const connector = await client.create({
	connectorName: 'Production PostgreSQL',
	connectorType: 'database',
	internalID: 'N1r8Do',
	configuration: {
		host: 'prod-db.example.com',
		port: 5432,
		database: 'production',
		username: 'app_user'
	},
	status: 'active'
});

// Create an API connector
const connector = await client.create({
	connectorName: 'Salesforce Production',
	connectorType: 'app',
	internalID: 'N1r8Do',
	configuration: {
		instanceUrl: 'https://mycompany.salesforce.com',
		apiVersion: '58.0'
	}
});
```

---

### `update(id, data)`

Update an existing connector.

#### Parameters

- `id` (string): Connector ID to update
- `data` (Partial\<Connector\>): Fields to update (partial update)

#### Returns

`Promise<Connector>`

#### Examples

```typescript
// Update connector name
const updated = await client.update('conn-123', {
	connectorName: 'Updated Name'
});

// Update connector configuration
const updated = await client.update('conn-123', {
	configuration: {
		host: 'new-host.example.com',
		port: 5433
	}
});

// Change connector status
const updated = await client.update('conn-123', {
	status: 'inactive'
});
```

---

### `delete(id)`

Delete a connector.

**⚠️ Warning:** This operation is permanent and cannot be undone. Consider setting `status: 'inactive'` for soft deletion.

#### Parameters

- `id` (string): Connector ID to delete

#### Returns

`Promise<void>`

#### Example

```typescript
await client.delete('conn-123');
console.log('Connector deleted');
```

---

### `getConfig(options?)`

Get system connector configuration.

**⚠️ Token Warning:** Returns ~50,000 tokens of configuration data. Use token efficiency options.

#### Parameters

- `options` (optional): Token efficiency options
  - `fields` (string): Comma-separated field names to return
  - `limit` (number): Maximum number of items to return

#### Returns

`Promise<SystemConfig>`

#### Examples

```typescript
// Get full config (large response)
const config = await client.getConfig();
console.log(config.sourceConnectors.length);
console.log(config.targetConnectors.length);

// Get specific fields only
const config = await client.getConfig({
	fields: 'hostingEnvironment,sourceConnectors,targetConnectors'
});
```

---

## Type Definitions

### `Connector`

```typescript
interface Connector {
	/** Numeric connector identifier */
	id?: number;

	/** String connector identifier (primary) */
	connectorID: string;

	/** Short internal connector code */
	internalID?: string;

	/** Human-readable connector name */
	connectorName: string;

	/** Connector type/category */
	connectorType: string;

	/** Connector operational status */
	status: ConnectorStatus;

	/** Full connector configuration object */
	configuration?: Record<string, unknown>;

	/** ISO timestamp of creation */
	createdAt?: string;

	/** ISO timestamp of last update */
	updatedAt?: string;

	/** Project this connector belongs to */
	projectId?: number;
}

type ConnectorStatus = 'active' | 'inactive' | 'error' | 'pending';
```

### `SystemConfig`

```typescript
interface SystemConfig {
	/** System configuration key */
	key?: string;

	/** Hosting environment (Azure, AWS, etc.) */
	hostingEnvironment?: string;

	/** Available source connector configurations */
	sourceConnectors?: ConnectorConfig[];

	/** Available target connector configurations */
	targetConnectors?: ConnectorConfig[];

	/** Additional configuration properties */
	[key: string]: unknown;
}
```

### `ConnectorConfig`

```typescript
interface ConnectorConfig {
	/** Connector type identifier */
	type: string;

	/** Display name */
	name: string;

	/** Connector category */
	category?: string;

	/** Configuration schema */
	schema?: Record<string, unknown>;

	/** Additional metadata */
	[key: string]: unknown;
}
```

---

## Best Practices

### 1. Always Use Token Efficiency Options

```typescript
// ❌ BAD: Fetches all connectors with full data (200K+ tokens!)
const connectors = await client.list(undefined, { count: false });

// ✅ GOOD: Count only (50 tokens)
const count = await client.list();

// ✅ GOOD: Specific fields and limit (500-1000 tokens)
const connectors = await client.list('N1r8Do', {
	count: false,
	fields: 'connectorID,connectorName,status',
	limit: 10
});
```

### 2. Filter by Project When Possible

```typescript
// ❌ AVOID: All connectors across all projects
const all = await client.list();

// ✅ BETTER: Connectors for specific project
const project = await client.list('N1r8Do');
```

### 3. Use Soft Deletion

```typescript
// ❌ PERMANENT: Cannot be undone
await client.delete('conn-123');

// ✅ REVERSIBLE: Can reactivate later
await client.update('conn-123', { status: 'inactive' });
```

### 4. Partial Updates

```typescript
// ❌ BAD: Sending entire connector object
await client.update('conn-123', fullConnectorObject);

// ✅ GOOD: Only send fields to update
await client.update('conn-123', {
	connectorName: 'New Name'
});
```

---

## Common Patterns

### Count Active Connectors

```typescript
const allConnectors = await client.list('N1r8Do', {
	count: false,
	fields: 'status'
});

const activeCount = allConnectors.filter(
	(c) => c.status === 'active'
).length;
console.log(`Active connectors: ${activeCount}`);
```

### Find Connector by Name

```typescript
const connectors = await client.list('N1r8Do', {
	count: false,
	fields: 'connectorID,connectorName'
});

const target = connectors.find(
	(c) => c.connectorName === 'My Database'
);
if (target) {
	const full = await client.get(target.connectorID);
}
```

### List Connector Types

```typescript
const connectors = await client.list('N1r8Do', {
	count: false,
	fields: 'connectorType'
});

const types = [...new Set(connectors.map((c) => c.connectorType))];
console.log('Connector types:', types);
```

---

## Error Handling

```typescript
import { ApiError, NetworkError } from '../utils/errors.ts';

try {
	const connector = await client.get('conn-123');
} catch (error) {
	if (error instanceof ApiError) {
		console.error(`API Error: ${error.message}`);
		console.error(`Status: ${error.statusCode}`);
		console.error(`Endpoint: ${error.endpoint}`);
	} else if (error instanceof NetworkError) {
		console.error(`Network Error: ${error.message}`);
		console.error(`URL: ${error.url}`);
	} else {
		console.error('Unknown error:', error);
	}
}
```

---

## Testing

Run tests:

```bash
bun test tests/connectors.test.ts
```

Run examples:

```bash
bun run examples/connectors-example.ts
```

---

## Related Documentation

- [Base Client](./base-client.md) - Core HTTP client functionality
- [Working Endpoints](../.claude-plugin/plugins/databasin/skills/databasin-api/references/working-endpoints.md) - API endpoint reference
- [Token Efficiency](../.claude-plugin/plugins/databasin/skills/databasin-api/references/token-efficiency.md) - Token optimization strategies

---

## Implementation Checklist

- ✅ Extends DatabasinClient
- ✅ All 6 methods implemented
- ✅ **Defaults to count mode for list()**
- ✅ Type-safe with generics
- ✅ Complete JSDoc with token efficiency warnings
- ✅ Compiles without errors
- ✅ Tests passing (11/11)
- ✅ Examples provided
- ✅ Documentation complete

**Status:** Phase 2 Complete ✅
