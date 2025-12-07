# Developer Guide

This guide covers local development setup, building from source, creating releases, and SDK usage for the Databasin CLI.

## Prerequisites

- [Bun](https://bun.sh) runtime v1.0 or later
- Git
- Databasin API access token (for testing)

## Local Development Setup

### Clone and Install

```bash
git clone https://github.com/Databasin-AI/databasin-cli.git
cd databasin-cli
bun install
```

### Development Commands

```bash
# Run CLI from source
bun run dev

# Run with arguments
bun run dev -- projects list
bun run dev -- --help

# Type checking
bun run typecheck

# Run tests
bun run test           # All tests
bun run test:unit      # Unit tests only
bun run test:smoke     # Verify CLI commands work (requires build)
bun run test:integration  # Integration tests (requires DATABASIN_TOKEN)
bun run test:all       # Typecheck + unit + build + smoke

# Full verification before commit
bun run verify
```

### Link for Local Testing

```bash
# Link CLI globally for testing
./scripts/dev-setup.sh link

# Now use 'databasin' command directly
databasin --version

# Remove global link when done
./scripts/dev-setup.sh unlink
```

## Building

### Quick Local Build

```bash
# Build minified local executable
bun run build:exe

# Output: dist/databasin
```

### Full Production Build

```bash
# Build for all platforms
bun run build

# Outputs:
# - dist/index.js (JavaScript bundle)
# - dist/linux-x64/databasin
# - dist/darwin-arm64/databasin
# - dist/darwin-x64/databasin
# - dist/build-info.json
```

### Clean Build

```bash
bun run clean          # Remove dist/
bun run clean && bun run build  # Clean rebuild
```

## Project Structure

```
src/
├── index.ts              # CLI entry point, Commander.js setup
├── config.ts             # Configuration management
├── client/               # API client layer
│   ├── base.ts          # DatabasinClient - core HTTP client
│   ├── projects.ts      # ProjectsClient
│   ├── connectors.ts    # ConnectorsClient
│   ├── pipelines.ts     # PipelinesClient
│   ├── automations.ts   # AutomationsClient
│   └── sql.ts           # SqlClient
├── commands/            # Command implementations
│   ├── auth.ts          # Authentication commands
│   ├── projects.ts      # Project commands
│   ├── connectors.ts    # Connector commands
│   ├── pipelines.ts     # Pipeline commands
│   ├── automations.ts   # Automation commands
│   ├── sql.ts           # SQL commands
│   └── api.ts           # Generic API commands
├── types/               # TypeScript definitions
└── utils/               # Shared utilities
    ├── formatters.ts    # Output formatting
    ├── progress.ts      # Spinners and progress
    └── errors.ts        # Error handling
```

## Configuration Priority

The CLI uses a cascading configuration system:

1. **CLI flags** (highest priority)
2. **Environment variables** (`DATABASIN_*`)
3. **Config file** (`~/.databasin/config.json`)
4. **Defaults** (lowest priority)

### Advanced Configuration

Full config file options (`~/.databasin/config.json`):

```json
{
  "apiUrl": "https://api.databasin.com",
  "defaultProject": "proj-123",
  "output": {
    "format": "table",
    "colors": true,
    "verbose": false
  },
  "debug": false,
  "noUpdateCheck": false
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASIN_TOKEN` | Authentication token |
| `DATABASIN_API_URL` | API base URL |
| `DATABASIN_DEBUG` | Enable debug mode (`true`/`false`) |
| `DATABASIN_CONFIG_PATH` | Override config file location |
| `DATABASIN_NO_UPDATE_CHECK` | Disable automatic update checks |
| `NO_COLOR` | Disable colored output |
| `DEBUG` | Alternative debug flag |

## SDK Usage

The CLI includes TypeScript clients that can be used programmatically.

### Basic Client Usage

```typescript
import { createClient } from '@databasin/cli/client';

const client = createClient({
  apiUrl: 'https://api.databasin.com',
  token: process.env.DATABASIN_TOKEN
});

// Make API requests
const projects = await client.get('/api/my/projects');
const connector = await client.post('/api/connectors', {
  name: 'My Connector',
  type: 'postgres'
});
```

### Using Specialized Clients

```typescript
import {
  createProjectsClient,
  createConnectorsClient,
  createPipelinesClient
} from '@databasin/cli/client';

const config = {
  apiUrl: 'https://api.databasin.com',
  token: process.env.DATABASIN_TOKEN
};

// Projects
const projects = createProjectsClient(config);
const myProjects = await projects.list();
const project = await projects.get('proj-123');

// Connectors
const connectors = createConnectorsClient(config);
const allConnectors = await connectors.list({ full: true });
const testResult = await connectors.test('conn-456');

// Pipelines
const pipelines = createPipelinesClient(config);
const pipelineList = await pipelines.list('proj-123');
await pipelines.run('pipeline-789');
const logs = await pipelines.getLogs('pipeline-789');
```

### Example: Automation Script

```typescript
#!/usr/bin/env bun

import { createPipelinesClient } from '@databasin/cli/client';

const pipelines = createPipelinesClient({
  apiUrl: process.env.DATABASIN_API_URL,
  token: process.env.DATABASIN_TOKEN
});

async function runDailyPipelines() {
  const projectId = 'proj-123';
  const pipelineList = await pipelines.list(projectId);

  for (const pipeline of pipelineList) {
    if (pipeline.tags?.includes('daily')) {
      console.log(`Running ${pipeline.name}...`);
      await pipelines.run(pipeline.id);
    }
  }
}

runDailyPipelines().catch(console.error);
```

See the [examples/](../examples/) directory for more SDK usage examples.

## Creating Releases

### Using the Release Script

```bash
# Bump patch version (0.5.0 -> 0.5.1)
./scripts/release.sh patch

# Bump minor version (0.5.0 -> 0.6.0)
./scripts/release.sh minor

# Bump major version (0.5.0 -> 1.0.0)
./scripts/release.sh major

# Release a specific version
./scripts/release.sh 1.2.3

# Dry run (see what would happen)
./scripts/release.sh patch --dry-run

# Create version/tag but don't push
./scripts/release.sh patch --no-push
```

### What the Release Script Does

1. Updates version in `package.json`
2. Creates a commit with the version bump
3. Creates a git tag (e.g., `v0.5.1`)
4. Pushes commit and tag to remote

### Automated CI/CD

Once pushed, GitHub Actions automatically:

1. Builds CLI for all platforms (Linux x64, macOS ARM64, macOS x64)
2. Runs tests and type checking
3. Publishes to npm as `@databasin/cli`
4. Creates GitHub release with build artifacts
5. Updates the install script's latest version

### Manual Release Steps

If you need to release manually:

```bash
# 1. Update version in package.json
npm version patch  # or minor/major

# 2. Build and test
bun run verify

# 3. Create and push tag
git push origin main
git push origin v$(cat package.json | jq -r .version)
```

## Adding New Commands

### 1. Create API Client

```typescript
// src/client/widgets.ts
import { DatabasinClient, createClient } from './base';
import type { CliConfig } from '../types/config';

export interface Widget {
  id: string;
  name: string;
  type: string;
}

export class WidgetsClient extends DatabasinClient {
  async list(): Promise<Widget[]> {
    return this.get<Widget[]>('/api/widgets');
  }

  async get(id: string): Promise<Widget> {
    return this.get<Widget>(`/api/widgets/${id}`);
  }

  async create(data: Partial<Widget>): Promise<Widget> {
    return this.post<Widget>('/api/widgets', data);
  }
}

export function createWidgetsClient(config: CliConfig): WidgetsClient {
  return new WidgetsClient(config);
}
```

### 2. Export from Client Index

```typescript
// src/client/index.ts
export * from './widgets';

// Add to createAllClients()
export function createAllClients(config: CliConfig) {
  return {
    // ... existing clients
    widgets: createWidgetsClient(config),
  };
}
```

### 3. Create Command

```typescript
// src/commands/widgets.ts
import { Command } from 'commander';
import type { CliConfig } from '../types/config';
import type { WidgetsClient } from '../client/widgets';
import { formatOutput } from '../utils/formatters';

export function createWidgetsCommand(): Command {
  const cmd = new Command('widgets')
    .description('Manage widgets');

  cmd
    .command('list')
    .description('List all widgets')
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      const config: CliConfig = opts._config;
      const client: WidgetsClient = opts._clients.widgets;

      const widgets = await client.list();
      console.log(formatOutput(widgets, config.output.format));
    });

  return cmd;
}
```

### 4. Register Command

```typescript
// src/index.ts
import { createWidgetsCommand } from './commands/widgets';

function registerCommands(program: Command): void {
  // ... existing commands
  program.addCommand(createWidgetsCommand());
}
```

### 5. Add Types

```typescript
// src/types/api.ts
export interface Widget {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}
```

## Testing

### Running Tests

```bash
# All tests
bun run test

# Specific test file
bun test tests/unit/pipelines-wizard.test.ts

# Watch mode
bun test --watch

# With coverage
bun test --coverage
```

### Integration Tests

Integration tests require a valid API token:

```bash
export DATABASIN_TOKEN="your-token"
export DATABASIN_API_URL="https://api.databasin.com"
bun run test:integration
```

### Smoke Tests

Smoke tests verify all CLI commands execute without errors:

```bash
# Build first
bun run build

# Run smoke tests
bun run test:smoke
```

## Troubleshooting Development

### Common Issues

**Build fails with type errors:**
```bash
bun run typecheck  # See detailed errors
```

**Tests fail with auth errors:**
```bash
# Ensure token is set
echo $DATABASIN_TOKEN

# Verify token works
bun run dev -- auth verify
```

**Global link not working:**
```bash
# Rebuild and relink
./scripts/dev-setup.sh unlink
bun run build
./scripts/dev-setup.sh link
```

### Debug Mode

```bash
# Enable debug output
DATABASIN_DEBUG=true bun run dev -- connectors list

# Or use the flag
bun run dev -- --debug connectors list
```
