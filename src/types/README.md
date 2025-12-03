# DataBasin CLI Type Definitions

Comprehensive TypeScript type definitions for the DataBasin CLI tool.

## Overview

This directory contains all type definitions used across the DataBasin CLI:

- **`api.ts`** - API entity types matching backend responses
- **`config.ts`** - CLI configuration schema and utilities
- **`cli.ts`** - CLI command types and interfaces
- **`index.ts`** - Central export point for all types

## Usage

Import types from the index file:

```typescript
import type {
 Project,
 Connector,
 Pipeline,
 CliConfig,
 CommandContext,
 CommandResult
} from './types/index';
```

## Type Categories

### API Entity Types (`api.ts`)

Types that match DataBasin API response structures:

**Core Entities:**

- `Project` - Data integration project
- `Organization` - Top-level organization
- `User` - User account
- `Connector` - Data source/destination
- `Pipeline` - Data pipeline
- `Automation` - Scheduled job
- `Report` - Saved report

**Query Types:**

- `QueryResult` - SQL query execution result
- `CatalogInfo` - Database catalog list
- `SchemaInfo` - Database schema list
- `TableInfo` - Database table list
- `ColumnInfo` - Table column metadata

**Response Types:**

- `ListResponse<T>` - Paginated list wrapper
- `ApiErrorResponse` - Standard error format
- `PingResponse` - Health check response

### Configuration Types (`config.ts`)

CLI configuration and settings:

**Main Types:**

- `CliConfig` - Complete configuration schema
- `PartialCliConfig` - Partial config for updates
- `OutputFormat` - Output format options
- `LogLevel` - Logging verbosity levels
- `ConfigPaths` - Platform-specific config paths

**Constants:**

- `DEFAULT_CONFIG` - Default configuration values
- `ENV_VARS` - Environment variable names

**Utilities:**

- `getConfigPaths()` - Get platform-specific paths
- `validateConfig()` - Validate configuration object
- `mergeConfigs()` - Merge multiple config sources
- `configFromEnv()` - Parse environment variables

### CLI Command Types (`cli.ts`)

Types for command handlers and options:

**Command Types:**

- `CommandContext` - Execution context passed to handlers
- `CommandHandler<TOptions, TResult>` - Handler function signature
- `CommandDefinition<TOptions, TResult>` - Command metadata
- `CommandResult<T>` - Standard command return value

**Option Types:**

- `GlobalOptions` - Available on all commands
- `ListOptions` - For list commands
- `CreateOptions` - For create/update commands
- `BulkOptions` - For bulk operations
- `SqlOptions` - For SQL query commands
- `ReportOptions` - For report generation

**UI Types:**

- `TableOptions` - Table formatting options
- `ProgressOptions` - Progress indicator options
- `PromptConfig` - Interactive prompt configuration
- `ValidationResult` - Validation result

## Type Patterns

### Entity Types

All entity types follow these conventions:

```typescript
export interface Entity {
 /** Numeric identifier */
 id: number;

 /** Human-readable name */
 name: string;

 /** ISO timestamp of creation */
 createdAt?: string;

 /** ISO timestamp of last update */
 updatedAt?: string;
}
```

### Command Handler Pattern

All command handlers follow this signature:

```typescript
export const myCommand: CommandHandler<MyOptions, MyResult> = async (
 context: CommandContext,
 options: MyOptions
): Promise<CommandResult<MyResult>> => {
 try {
  // Command implementation
  const result = await doSomething(context, options);

  return {
   success: true,
   data: result,
   exitCode: 0
  };
 } catch (error) {
  return {
   success: false,
   error: error.message,
   exitCode: 1
  };
 }
};
```

### Options Extension Pattern

Command-specific options extend `GlobalOptions`:

```typescript
export interface MyCommandOptions extends GlobalOptions {
 // Command-specific options
 myOption?: string;
}
```

For options that conflict with global options, use `Omit`:

```typescript
export interface SpecialOptions extends Omit<GlobalOptions, 'format'> {
 // Custom format option that differs from global
 customFormat?: 'special1' | 'special2';
}
```

## API Entity Reference

### Project

```typescript
interface Project {
 id: number; // Numeric ID
 internalID: string; // Short code (e.g., "N1r8Do")
 name: string; // Display name
 description?: string; // Optional description
 organizationId: number; // Parent org ID
 organizationName?: string; // Parent org name
 administratorId?: number; // Admin user ID
 createdDate: string; // ISO timestamp
 deleted: boolean; // Soft delete flag
 favorited?: boolean; // User favorite flag
}
```

### Connector

```typescript
interface Connector {
 connectorID: string; // Primary identifier
 internalID?: string; // Short code
 connectorName: string; // Display name
 connectorType: string; // Type category
 status: ConnectorStatus; // Operational status
 configuration?: Record<string, unknown>;
 createdAt?: string;
 updatedAt?: string;
}

type ConnectorStatus = 'active' | 'inactive' | 'error' | 'pending';
```

### Pipeline

```typescript
interface Pipeline {
 pipelineID: number; // Numeric ID
 internalID?: string; // Short code
 pipelineName: string; // Display name
 sourceConnectorId?: string; // Source connector
 targetConnectorId?: string; // Target connector
 status: PipelineStatus; // Operational status
 enabled: boolean; // Enabled flag
 lastRunDate?: string; // Last execution
 artifacts?: PipelineArtifact[];
}

type PipelineStatus = 'active' | 'inactive' | 'running' | 'error' | 'pending';
```

### Automation

```typescript
interface Automation {
 automationID: number; // Numeric ID
 internalID: string; // Short code
 automationName: string; // Display name
 jobRunSchedule: string; // Cron expression
 isActive: boolean; // Active flag
 currentlyRunning?: boolean; // Execution status
 lastRunStatus?: AutomationStatus;
 automationTasks?: string[]; // Task types
 jobClusterSize?: 's' | 'M' | 'L';
}

type AutomationStatus = 'Successful' | 'Failed' | 'Running' | 'Stopped' | 'Pending';
```

### QueryResult

```typescript
interface QueryResult {
 success: boolean; // Execution success
 sql: string; // Executed query
 columns: string[]; // Column names
 rows: Record<string, unknown>[]; // Result rows
 rowCount: number; // Number of rows
 executionTime: number; // Time in ms
 timestamp: string; // Execution time
 error?: string; // Error message
}
```

## Configuration Schema

### Complete Configuration

```typescript
interface CliConfig {
 apiUrl: string; // API base URL
 defaultProject?: string; // Default project

 output: {
  format: OutputFormat; // 'table' | 'json' | 'csv'
  colors: boolean; // Enable colors
  verbose: boolean; // Verbose output
 };

 tokenEfficiency: {
  defaultLimit: number; // Default list limit
  warnThreshold: number; // Token warning level
 };

 timeout: number; // Request timeout (ms)
 debug: boolean; // Debug logging
}
```

### Environment Variables

```typescript
const ENV_VARS = {
 API_URL: 'DATABASIN_API_URL',
 TOKEN: 'DATABASIN_TOKEN',
 DEFAULT_PROJECT: 'DATABASIN_DEFAULT_PROJECT',
 DEBUG: 'DATABASIN_DEBUG',
 CONFIG_PATH: 'DATABASIN_CONFIG_PATH',
 TIMEOUT: 'DATABASIN_TIMEOUT',
 OUTPUT_FORMAT: 'DATABASIN_OUTPUT_FORMAT',
 NO_COLOR: 'NO_COLOR'
};
```

## Command Result Pattern

All commands return `CommandResult<T>`:

```typescript
interface CommandResult<T = unknown> {
 success: boolean; // Success flag
 data?: T; // Result data
 error?: string; // Error message
 exitCode: number; // Process exit code
 warnings?: string[]; // Warning messages
}
```

**Success example:**

```typescript
return {
 success: true,
 data: projects,
 exitCode: 0
};
```

**Error example:**

```typescript
return {
 success: false,
 error: 'Project not found',
 exitCode: 1,
 warnings: ['Token will expire soon']
};
```

## Type Safety Best Practices

### Always Use Type Imports

```typescript
// Good
import type { Project, Connector } from './types/index';

// Avoid (imports at runtime)
import { Project, Connector } from './types/index';
```

### Type Function Parameters

```typescript
// Good
async function getProject(id: string): Promise<Project> {
 // ...
}

// Avoid
async function getProject(id) {
 // ...
}
```

### Use Generic Types

```typescript
// Good
function formatList<T>(items: T[], formatter: (item: T) => string): string {
 return items.map(formatter).join('\n');
}

// Avoid
function formatList(items: any[], formatter: any): string {
 // ...
}
```

### Validate API Responses

```typescript
import type { Project, ApiErrorResponse } from './types/index';

async function fetchProject(id: string): Promise<Project> {
 const response = await fetch(`/api/projects/${id}`);

 if (!response.ok) {
  const error: ApiErrorResponse = await response.json();
  throw new Error(error.message);
 }

 const project: Project = await response.json();
 return project;
}
```

## Extending Types

### Adding New Entity Types

1. Add to `api.ts`:

```typescript
export interface NewEntity {
 id: number;
 name: string;
 // ... other fields
}
```

2. Export from `index.ts`:

```typescript
export type { NewEntity } from './api';
```

### Adding New Command Options

1. Add to `cli.ts`:

```typescript
export interface NewCommandOptions extends GlobalOptions {
 specificOption?: string;
}
```

2. Export from `index.ts`:

```typescript
export type { NewCommandOptions } from './cli';
```

## Related Files

- `/src/cli/src/client/ApiClient.ts` - Uses API types
- `/src/cli/src/commands/*.ts` - Use command types
- `/src/cli/src/utils/config.ts` - Uses config types
- `/.claude-plugin/plugins/databasin/skills/databasin-api/references/working-endpoints.md` - API documentation

## Validation

Run TypeScript compiler to validate types:

```bash
cd src/cli
bun run --bun tsc --noEmit --module es2015 --esModuleInterop src/types/*.ts
```

All types should compile without errors.
