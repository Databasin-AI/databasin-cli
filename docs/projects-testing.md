# Projects Command Testing Guide

This guide demonstrates testing all project commands with various options.

## Setup

Ensure you have:

1. A valid authentication token
2. API URL configured (default: http://localhost:9000)
3. At least one project accessible to your account

## Test Commands

### 1. List Projects

#### Basic list (table format - default)

```bash
bun run src/index.ts projects list
```

Expected output:

- Spinner: "Fetching projects..."
- Success: "Fetched N projects"
- Table with columns: id, name, internalID, organizationName, etc.

#### Count only

```bash
bun run src/index.ts projects list --count
```

Expected output:

- Spinner: "Fetching project count..."
- Success: "Project count: N"

#### Limited results

```bash
bun run src/index.ts projects list --limit 5
```

Expected output:

- Table with maximum 5 projects

#### Field filtering

```bash
bun run src/index.ts projects list --fields id,name,internalID
```

Expected output:

- Table with only specified columns

#### Status filtering

```bash
bun run src/index.ts projects list --status active
```

Expected output:

- Only active projects (not deleted)

#### JSON format

```bash
bun run src/index.ts projects list --json
```

Expected output:

- JSON array of projects with syntax highlighting

#### CSV format

```bash
bun run src/index.ts projects list --csv
```

Expected output:

- RFC 4180 compliant CSV with headers

#### Combined options

```bash
bun run src/index.ts projects list --fields id,name --limit 3 --json
```

Expected output:

- JSON array with only id and name fields, max 3 items

### 2. Get Project Details

#### With project ID

```bash
bun run src/index.ts projects get N1r8Do
```

Expected output:

- Spinner: "Fetching project details..."
- Success: "Project retrieved"
- Transposed key-value table showing all project fields

#### Without project ID (interactive)

```bash
bun run src/index.ts projects get
```

Expected behavior:

- Prompts with interactive selection menu
- Shows all available projects
- After selection, displays project details

#### Field filtering

```bash
bun run src/index.ts projects get N1r8Do --fields name,description,createdDate
```

Expected output:

- Table with only specified fields

#### JSON format

```bash
bun run src/index.ts projects get N1r8Do --json
```

Expected output:

- JSON object with full project details

#### Error cases

**Project not found:**

```bash
bun run src/index.ts projects get invalid-id
```

Expected output:

- Error icon
- Message: "Project not found"
- Suggestion: "Run 'databasin projects list' to see available projects"

### 3. List Project Users

#### With project ID

```bash
bun run src/index.ts projects users N1r8Do
```

Expected output:

- Spinner: "Fetching project users..."
- Success: "Fetched N users"
- Table with user details (email, firstName, lastName, roles, etc.)

#### Without project ID (interactive)

```bash
bun run src/index.ts projects users
```

Expected behavior:

- Prompts for project selection
- After selection, displays user list

#### Field filtering

```bash
bun run src/index.ts projects users N1r8Do --fields email,firstName,lastName
```

Expected output:

- Table with only specified fields

#### JSON format

```bash
bun run src/index.ts projects users N1r8Do --json
```

Expected output:

- JSON array of user objects

#### Empty result

If project has no users:

- Spinner succeeds with: "No users found"

### 4. Show Project Statistics

#### With project ID

```bash
bun run src/index.ts projects stats N1r8Do
```

Expected output:

- Spinner: "Fetching project statistics..."
- Success: "Statistics retrieved"
- Table with metric-count pairs:
  - Connectors: N
  - Pipelines: N
  - Automations: N

#### Without project ID (interactive)

```bash
bun run src/index.ts projects stats
```

Expected behavior:

- Prompts for project selection
- After selection, displays statistics

#### JSON format

```bash
bun run src/index.ts projects stats N1r8Do --json
```

Expected output:

- JSON object with statistics

#### CSV format

```bash
bun run src/index.ts projects stats N1r8Do --csv
```

Expected output:

- CSV with Metric,Count columns

## Global Options Testing

### No Color Mode

```bash
bun run src/index.ts projects list --no-color
```

Expected:

- No ANSI color codes in output
- Plain text table

### Verbose Mode

```bash
bun run src/index.ts projects list --verbose
```

Expected:

- Additional logging information

### Debug Mode

```bash
bun run src/index.ts projects get invalid-id --debug
```

Expected:

- Full error stack traces
- Detailed error information

### API URL Override

```bash
bun run src/index.ts projects list --api-url https://custom.api.com
```

Expected:

- Uses specified API URL instead of default

## Token Efficiency Testing

### Large Dataset Warning

```bash
bun run src/index.ts projects list
```

If result has >50 projects:

- Warning message about token usage
- Suggestions to use --count, --fields, or --limit

### Efficient Queries

```bash
# Only count
bun run src/index.ts projects list --count

# Limited fields
bun run src/index.ts projects list --fields id,name

# Limited results
bun run src/index.ts projects list --limit 10
```

Expected:

- No token efficiency warnings

## Error Handling Testing

### Authentication Errors

Remove or corrupt token:

```bash
bun run src/index.ts projects list --token invalid
```

Expected:

- Clear error message about authentication failure

### Network Errors

Use wrong API URL:

```bash
bun run src/index.ts projects list --api-url http://localhost:9999
```

Expected:

- Connection error with helpful message

### Permission Errors

Try to access restricted project:

```bash
bun run src/index.ts projects get restricted-project-id
```

Expected:

- 403 error with "Access denied" message

## Interactive Prompt Testing

### Project Selection

```bash
bun run src/index.ts projects get
```

Test:

1. Arrow keys navigate through list
2. Enter selects project
3. Ctrl+C cancels operation
4. Shows project name and ID for each option

### Cancellation Handling

Start interactive prompt and press Ctrl+C:

```bash
bun run src/index.ts projects get
# Press Ctrl+C
```

Expected:

- Graceful exit
- Error message: "Selection cancelled"

## Output Format Consistency

### Table Format

- Aligned columns
- Clear headers
- Consistent spacing
- Handles long values gracefully

### JSON Format

- Valid JSON
- Proper indentation (2 spaces)
- Syntax highlighting (when colors enabled)
- Handles nested objects

### CSV Format

- RFC 4180 compliant
- Proper quote escaping
- Headers in first row
- Consistent field ordering

## Performance Testing

### Large Result Sets

```bash
# Time the operation
time bun run src/index.ts projects list
```

Expected:

- Completes in reasonable time
- Shows spinner during operation
- Success message with count

### Pagination

```bash
# First page
bun run src/index.ts projects list --limit 10

# Could implement offset in future
# bun run src/index.ts projects list --limit 10 --offset 10
```

## Acceptance Criteria Checklist

- [x] All 4 commands implemented (list, get, users, stats)
- [x] Interactive prompts work when ID not provided
- [x] Token efficiency warnings for large result sets
- [x] Field filtering works with --fields option
- [x] Count mode returns just the count
- [x] All formats supported (table/json/csv)
- [x] Spinners show during API calls
- [x] Error messages are helpful with suggestions
- [x] Commands respect global flags (--json, --csv, --no-color)

## Known Issues / Future Enhancements

1. **Pagination**: Currently fetches all results, could add --offset support
2. **Sorting**: Could add --sort option for list command
3. **Search**: Could add --search option for filtering by name
4. **Create/Update**: Could add commands for creating/updating projects
5. **Caching**: Could cache project list for faster interactive prompts
