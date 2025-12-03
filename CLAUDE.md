# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DataBasin CLI is a command-line interface for the DataBasin data integration platform. Built with Bun and TypeScript, it provides commands for managing projects, connectors, pipelines, SQL queries, and automations.

## Development Commands

```bash
# Development
bun run dev                    # Run CLI from source
bun run build                  # Full production build (multi-platform executables)
bun run build:exe              # Quick local executable (minified)
./scripts/dev-setup.sh link    # Link CLI globally for testing
./scripts/dev-setup.sh unlink  # Remove global link

# Testing
bun run test                   # Run all tests
bun run test:unit              # Unit tests only
bun run test:smoke             # Verify all CLI commands work (requires build)
bun run test:integration       # Integration tests (requires DATABASIN_TOKEN)
bun run test:all               # Typecheck + unit + build + smoke
bun run verify                 # Full verification before commit

# Single test file
bun test tests/unit/pipelines-wizard.test.ts

# Type Checking
bun run typecheck              # TypeScript validation

# Clean
bun run clean                  # Remove dist/ directory
```

## Architecture

### Directory Structure

```
src/
├── index.ts              # CLI entry point, Commander.js setup
├── config.ts             # Configuration management (file, env, CLI priority)
├── client/               # API client layer
│   ├── base.ts          # DataBasinClient - core HTTP client with auth
│   ├── projects.ts      # ProjectsClient
│   ├── connectors.ts    # ConnectorsClient
│   ├── pipelines.ts     # PipelinesClient
│   ├── automations.ts   # AutomationsClient
│   └── sql.ts           # SqlClient
├── commands/            # Command implementations (Commander.js)
│   ├── projects.ts      # databasin projects [list|get|users|stats]
│   ├── connectors.ts    # databasin connectors [list|get|create|update|delete]
│   ├── pipelines.ts     # databasin pipelines [list|get|create|run|logs]
│   ├── automations.ts   # databasin automations [list|get|run]
│   ├── sql.ts           # databasin sql [catalogs|schemas|tables|exec]
│   ├── api.ts           # databasin api [GET|POST|PUT|DELETE]
│   └── auth.ts          # databasin auth [whoami|verify]
├── types/               # TypeScript type definitions
│   ├── config.ts        # CliConfig, OutputFormat
│   └── api.ts           # API response types
└── utils/               # Shared utilities
    ├── formatters.ts    # Output formatting (table, JSON, CSV)
    ├── progress.ts      # Spinner and progress indicators (ora)
    ├── errors.ts        # Error types and handling
    └── auth.ts          # Token loading and management
```

### Key Patterns

**Configuration Priority Cascade**:
1. CLI flags (highest)
2. Environment variables (DATABASIN_*)
3. Config file (~/.databasin/config.json)
4. Defaults (lowest)

**Client Pattern**: All API clients extend the base `DataBasinClient`:
```typescript
// src/client/base.ts - Core HTTP client with:
// - Automatic token injection
// - 401 token refresh and retry
// - Token efficiency (count, fields, limit)
// - Debug logging
const client = createClient(config);
const data = await client.get<Project[]>('/api/my/projects', { limit: 10 });
```

**Command Pattern**: Commands use Commander.js with global options:
```typescript
// Access config and clients in commands via optsWithGlobals()
async function listCommand(options: {}, command: Command) {
    const opts = command.optsWithGlobals();
    const config: CliConfig = opts._config;
    const client: ProjectsClient = opts._clients.projects;
    // ...
}
```

**Output Formatting**: Three formats supported (table, JSON, CSV):
```typescript
import { formatOutput, formatTable, formatJson, formatCsv } from './utils/formatters';
console.log(formatOutput(data, format, { fields, colors }));
```

### Token Efficiency

The CLI implements token efficiency features to reduce API response sizes:
- `--count`: Return only count instead of full data
- `--limit <n>`: Limit number of results
- `--fields <a,b,c>`: Filter to specific fields

Warnings appear when responses exceed threshold (default 50000 chars).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASIN_TOKEN` | JWT authentication token |
| `DATABASIN_API_URL` | API base URL (default: http://localhost:9000) |
| `DATABASIN_DEBUG` | Enable debug mode with stack traces |
| `DATABASIN_CONFIG_PATH` | Override config file location |
| `NO_COLOR` | Disable colored output |

## Testing

Tests use Bun's built-in test runner:
```bash
bun run test                          # All tests
bun run test:unit                     # Unit tests only
bun test tests/unit/pipelines-*.ts    # Specific test files
bun test --watch                      # Watch mode
```

Integration tests require a valid `DATABASIN_TOKEN`:
```bash
export DATABASIN_TOKEN="your-token"
bun run test:integration
```

## Build Process

The build script (`build.ts`) creates:
1. JavaScript bundle (`dist/index.js`)
2. Platform executables:
   - `dist/linux-x64/databasin`
   - `dist/darwin-arm64/databasin`
   - `dist/darwin-x64/databasin`
3. Build metadata (`dist/build-info.json`)

Build artifacts are also copied to `../../static/downloads/cli/` for the parent project.

## Adding New Commands

1. Create command file in `src/commands/{resource}.ts`
2. Create API client in `src/client/{resource}.ts` extending DataBasinClient
3. Export client factory from `src/client/index.ts`
4. Register command in `src/index.ts` via `registerCommands()`
5. Add types to `src/types/api.ts`

## Dependencies

- **commander**: CLI framework
- **chalk**: Terminal colors
- **cli-table3**: Table formatting
- **ora**: Progress spinners
- **prompts**: Interactive prompts
