# Project ID Mapping

## Overview

The Databasin CLI uses **internal project IDs** (e.g., `5QiuoY0J`, `N1r8Do`) as the primary identifier in all command outputs. For convenience, the CLI automatically maps between numeric project IDs and internal project IDs, allowing users to use either ID format interchangeably in command inputs.

> **Note**: As of recent versions, all CLI output displays `internalId` as the primary project identifier. Numeric IDs are hidden by default but can be requested with `--fields id`.

## Problem Statement

Users were often passing numeric project IDs (e.g., `123`) to commands instead of internal IDs (e.g., `5QiuoY0J`). This caused API errors because most endpoints expect internal IDs. Additionally, showing numeric IDs in output was inconsistent with internal IDs used in API calls.

## Solution

The CLI now automatically detects and converts numeric project IDs to internal IDs using cached project data. This happens transparently without any changes to command syntax.

## How It Works

1. **ID Detection**: When a project ID is provided, the CLI checks if it's numeric
2. **Cache Lookup**: Fetches project list from cache (or API if cache miss)
3. **ID Resolution**: Maps the numeric ID to the corresponding internal ID
4. **API Call**: Uses the resolved internal ID in API requests

## Supported Commands

The following commands now support both numeric and internal project IDs:

- `databasin connectors list --project <id>`
- `databasin connectors get --project <id>`
- `databasin connectors create --project <id>`
- `databasin pipelines list --project <id>`
- `databasin pipelines wizard --project <id>`
- `databasin automations list --project <id>`

## Examples

### Before (Required Internal ID)

```bash
# User had to know and use the internal ID
databasin pipelines list --project N1r8Do

# Using numeric ID would fail
databasin pipelines list --project 123
# Error: Project not found
```

### After (Both IDs Work)

```bash
# Internal ID still works
databasin pipelines list --project N1r8Do

# Numeric ID now works too!
databasin pipelines list --project 123
# Automatically resolves 123 -> N1r8Do
```

## Performance

- **Caching**: Project lists are cached for 24 hours to minimize API calls
- **Efficiency**: Multiple ID resolutions use the same cached data
- **Batch Operations**: The `resolveProjectIds()` function handles multiple IDs in a single API call

## Implementation Details

### Core Functions

**`resolveProjectId(id, client, options?)`**
- Resolves a single project ID (numeric or internal)
- Returns the internal ID
- Uses cache by default

**`resolveProjectIds(ids, client, options?)`**
- Resolves multiple project IDs efficiently
- Single API call for all resolutions
- Preserves input order

**`validateProjectId(id, client, options?)`**
- Resolves and validates project exists
- Throws descriptive errors if not found
- Optional validation bypass

**`isNumericId(id)`**
- Utility to check if ID is numeric
- Returns true for IDs like "123", false for "N1r8Do"

**`clearProjectsCache()`**
- Clears cached project list
- Useful after creating/deleting projects

### Cache Strategy

- **Location**: `~/.databasin/cache/projects_list.json`
- **TTL**: 24 hours (configurable)
- **Auto-refresh**: Cache updates on expiry
- **Manual clear**: Use `clearProjectsCache()`

## Error Handling

### Invalid Project ID

```bash
$ databasin pipelines list --project 999
Error: Project not found: 999 (numeric ID).
Run 'databasin projects list' to see available projects.
```

### Network Errors

If the API call fails, the CLI falls back gracefully:
- Returns original ID (let API handle error)
- Logs debug information
- Provides helpful error messages

## Testing

Comprehensive test suite in `tests/unit/project-id-mapper.test.ts`:

```bash
bun test tests/unit/project-id-mapper.test.ts
```

Tests cover:
- Numeric ID detection
- ID resolution (numeric → internal)
- Internal ID pass-through
- Batch resolution
- Cache behavior
- Error handling
- Validation

## Migration Guide

### For CLI Users

No changes needed! Both ID formats work automatically.

### For Developers

If you're adding new commands that accept project IDs:

```typescript
import { resolveProjectId } from '../utils/project-id-mapper';

async function myCommand(options: { project?: string }, command: Command) {
  const opts = command.optsWithGlobals();
  const projectsClient: ProjectsClient = opts._clients.projects;

  // Resolve project ID (handles both formats)
  let projectId = options.project;
  if (projectId) {
    projectId = await resolveProjectId(projectId, projectsClient);
  }

  // Now use projectId in API calls
  await someApiCall(projectId);
}
```

## Future Enhancements

Potential improvements for future releases:

1. **Connector ID Mapping**: Apply same pattern to connector IDs
2. **Pipeline ID Mapping**: Support numeric pipeline IDs
3. **Cache Warming**: Pre-fetch project list on CLI startup
4. **Smart Suggestions**: Suggest similar project IDs on typos
5. **Fuzzy Matching**: Support partial project names

## Troubleshooting

### Cache Issues

If ID resolution behaves unexpectedly:

```bash
# Clear cache manually
rm -rf ~/.databasin/cache/

# Or in code
import { clearProjectsCache } from './utils/project-id-mapper';
clearProjectsCache();
```

### Debug Logging

Enable debug mode to see ID resolution details:

```bash
export DATABASIN_DEBUG=true
databasin pipelines list --project 123

# Output:
# DEBUG: Resolving numeric project ID "123" to internal ID
# DEBUG: Fetching projects list for ID resolution (cache miss)
# DEBUG: Resolved numeric ID "123" to internal ID "N1r8Do"
```

## References

- Source: `src/utils/project-id-mapper.ts`
- Tests: `tests/unit/project-id-mapper.test.ts`
- Cache: `src/utils/config-cache.ts`
