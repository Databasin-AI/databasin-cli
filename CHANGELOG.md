# Changelog

All notable changes to Databasin CLI will be documented in this file.

## [Unreleased]

## [0.5.4] - 2025-12-07

### Added

- **Documentation Command** (`databasin docs`)
  - List all available documentation files from GitHub
  - Display documentation content (raw markdown by default, `--pretty` for formatted output)
  - Fetches latest documentation from public GitHub repository
  - Raw markdown output by default (ideal for piping and scripting)
  - Optional `--pretty` flag for rich terminal formatting with:
    - Headers (with colored underlines)
    - Code blocks (with syntax highlighting borders)
    - Inline code, bold, and italic formatting
    - Bulleted and numbered lists
    - Links and blockquotes
    - Horizontal rules
  - No authentication required
  - Color-aware output (respects `--no-color` flag)
  - Examples:
    - `databasin docs` - List all available documentation
    - `databasin docs quickstart` - View raw markdown
    - `databasin docs quickstart --pretty` - View with rich formatting
    - `databasin docs quickstart | grep "auth"` - Pipe for scripting

### Changed

- **Documentation Updates**
  - Added "Getting Help" section to usage-examples.md
  - Updated README with docs command examples
  - Main help text now includes docs command examples
  - Created concise docs-command.md guide

## [0.5.3] - 2025-12-07

### Added

- **Connector Configuration Command**
  - New `databasin connectors config` command to view connector configurations
  - Shows connector category, active status, and required pipeline screens
  - `--screens` flag displays detailed workflow screen information
  - `--all` flag lists all 51 available connector configurations
  - Supports table, JSON, and CSV output formats
  - Helps understand pipeline wizard workflows for each connector type
  - Uses cached configuration files from web app (5-minute TTL)

### Changed

- **Configuration Management**
  - Added `DATABASIN_WEB_URL` environment variable for web app URL
  - ConfigurationClient now included in default client exports
  - Config loader supports `webUrl` in all configuration sources

## [0.6.0] - TBD

### Planned

- Bulk operations from CSV
- Built-in connector templates
- Request batching support
- Config file validation
- Real-time log streaming

## [0.5.2] - 2025-12-07

### Fixed

- **Self-Update Cross-Device Move Error**
  - Fixed `EXDEV: cross-device link not permitted` error when updating CLI
  - Added `safeMove()` helper that handles cross-filesystem moves (e.g., `/tmp` to `/home`)
  - Update command now uses copy+delete fallback when rename fails across devices
  - All file move operations in update flow now work across different filesystems

## [0.5.1] - 2025-12-07

### Added

- **Shell Completions** (3 shells supported)
  - Bash completion script with intelligent option filtering
  - Zsh completion with grouped options and descriptions
  - Fish completion with context-aware suggestions
  - Automatic completion installation: `databasin completion install`
  - Dynamic completion generation from live CLI structure

### Changed

- **Documentation Updates**
  - Added Developer Guide for local setup and usage
  - Updated connector examples to use `dbserver.example.com` instead of localhost
  - Updated configuration URLs to point to production API
  - Improved command examples and authentication flow comments
  - Added real-time log streaming gap analysis document

## [0.5.0] - 2024-12-07

### Added

- **Observability Commands** (8 new commands)
  - Pipeline: `history`, `artifacts logs`, `artifacts history`
  - Automation: `logs`, `tasks logs`, `history`, `tasks history`
  - Full format support: JSON, CSV, table
  - Token efficiency: `--count`, `--limit`, `--fields`

- **Type Definitions** (7 new interfaces)
  - Pipeline/Artifact/Automation history and log entry types
  - Comprehensive JSDoc documentation

- **Complete Documentation** (10 new/updated files)
  - Automations guide + quickstart + client doc
  - Pipelines client documentation
  - Connectors quickstart guide
  - Observability guide + quickstart
  - Real-world usage examples
  - 1,200+ lines of new documentation

- **Documentation Standardization**
  - All command groups: guide, quickstart, client doc
  - Consistent naming and structure
  - Professional API documentation

### Fixed

- Log commands now respect `--json` and `--csv` flags (C1)
- Parameter mapping: CLI `--run-id` → API `currentRunID` (C2)
- Type guards for count mode responses (C3)
- Token efficiency options properly passed to API (M3)

## [0.4.0] - 2024-12-06

### Added

- **Project ID Mapping**
  - Automatic conversion between numeric project IDs and internal IDs
  - Users can now use either ID format interchangeably in all commands
  - Intelligent caching system (24-hour TTL) for optimal performance
  - Batch resolution support for multiple IDs
  - Validation with helpful error messages
  - Zero API calls for cached lookups after initial fetch
  - Supports commands: `connectors`, `pipelines`, `automations`, `pipelines wizard`

- **New Documentation**
  - `docs/project-id-mapping.md` - Comprehensive technical guide (294 lines)
  - `docs/QUICK-START-ID-MAPPING.md` - User-friendly quick reference
  - `docs/API-PARAMETER-FIXES.md` - Detailed API fix documentation
  - `CHANGELOG-project-id-mapping.md` - Feature-specific changelog

- **Enhanced Type Definitions**
  - Added `institutionID` and `ownerID` fields to Pipeline interface
  - Made several Pipeline fields optional to match actual API responses
  - Improved type safety across all API clients

### Fixed

- **Critical API Parameter Fixes** (5 endpoints)

  1. **Pipelines List Endpoint**
     - Fixed 400 Bad Request error when listing pipelines
     - Now sends all 3 required parameters: `institutionID`, `internalID`, `ownerID`
     - Command now works: `databasin pipelines list --project <id>`

  2. **Pipeline Run Endpoint**
     - Fixed broken pipeline execution command
     - Corrected request body to include all required parameters
     - Added automatic parameter fetching from pipeline details
     - Command now works: `databasin pipelines run <pipeline-id>`

  3. **Automations Run Endpoint**
     - Fixed incorrect API endpoint URL (`/api/automations/run` instead of `/api/automations/{id}/run`)
     - Added required request body parameters
     - Fetches automation details to populate `institutionID` and `internalID`
     - Command now works: `databasin automations run <automation-id>`

  4. **Automations Stop Endpoint**
     - Fixed incorrect API endpoint URL (same pattern as run)
     - Added required request body parameters
     - Command now works: `databasin automations stop <automation-id>`

  5. **Connectors List Enhancement**
     - Enhanced filtering by including both `institutionID` and `internalID` parameters
     - Improved precision when filtering by project
     - Graceful fallback if project fetch fails

### Changed

- **API Client Architecture**
  - All clients now validate and fetch required parameters before API calls
  - Implemented parameter auto-population pattern across pipelines and automations clients
  - Enhanced error messages with specific parameter validation
  - Added JSDoc documentation for all parameter requirements

- **Test Coverage**
  - Updated automation client tests to verify correct endpoints and body parameters
  - Enhanced mock responses to include all required fields
  - All tests passing: 638 pass, 4 skip, 0 fail

### Performance

- **Caching Strategy**
  - Project list cached for 24 hours to minimize API calls
  - First ID resolution: 2 API calls (initial fetch + resolution)
  - Subsequent resolutions: 0 API calls (uses cache)
  - Batch operations use single cached lookup for all IDs

### Developer Experience

- **Better Error Handling**
  - Descriptive validation errors for missing parameters
  - Helpful suggestions in error messages
  - Debug logging shows ID resolution process with `DEBUG=true`

### Backend Validation

- All fixes verified against production backend API implementation
  - Cross-referenced with `/tpi-datalake-api/conf/routes`
  - Validated against Scala controller implementations
  - Matched case class definitions in backend models

### Breaking Changes

None - All changes are backward compatible

## [0.3.3] - 2024-12-03

### Fixed

- **GitHub Release Asset Naming**
  - Fixed release workflow failing due to duplicate asset names
  - Binaries now uploaded with platform suffix (e.g., `databasin-linux-x64`, `databasin-darwin-arm64`)
  - Install script and self-update command download platform-specific binary
  - Binary is renamed to `databasin` during installation for seamless usage

## [0.3.2] - 2025-12-03

### Added

- **Automatic Update Notifications**
  - CLI automatically checks for new versions on GitHub (at most once per week)
  - Displays notification box when a newer version is available
  - Non-blocking: checks run in background with 5-second timeout
  - Notification appears on stderr to not interfere with piped output
  - Update state cached in `~/.databasin/update-check.json`

- **Disable Update Checks**
  - Config file option: `"noUpdateCheck": true` in `~/.databasin/config.json`
  - Environment variable: `DATABASIN_NO_UPDATE_CHECK=true` or `=1`
  - Skips check when running `databasin update` command (already handles updates)

### Changed

- Added `noUpdateCheck` field to CLI configuration schema
- Updated help text to document `DATABASIN_NO_UPDATE_CHECK` environment variable

## [0.3.1] - 2025-12-02

### Added

- **Self-Update Command** (`databasin update`)
  - Check for updates with `databasin update --check`
  - Auto-download and install latest release from GitHub
  - Platform detection (linux-x64, darwin-arm64, darwin-x64)
  - Safe installation with backup and rollback on failure
  - Detects npm installs and suggests `npm update` instead
  - Force update option (`--force`) to reinstall current version

### Changed

- Updated README with self-update documentation
- Added update command to smoke tests

## [0.3.0] - 2025-12-02

### Added

- **Node.js Compatibility**
  - CLI now works with both Node.js 18+ and Bun 1.0+
  - `npm install -g @databasin/cli` now supported
  - `npx @databasin/cli` for one-off usage
  - Standalone binaries still available (no runtime required)

- **npm Publishing**
  - Published to npm as `@databasin/cli`
  - Concise npm-specific README with quick start guide
  - Full documentation remains on GitHub

- **GitHub Actions Release Workflow**
  - Automated releases on version tags
  - Multi-platform binary builds (Linux x64, macOS ARM64, macOS x64)
  - Automatic npm publishing
  - GitHub Release creation with assets
  - Release notes extraction from CHANGELOG

- **Installation Script**
  - One-line install: `curl -fsSL .../install.sh | bash`
  - Platform auto-detection
  - Installs to `/usr/local/bin/databasin`

- **Release Automation Script**
  - `./scripts/release.sh patch|minor|major`
  - Version bumping with validation
  - Git tag creation and push
  - Dry-run mode for testing

### Changed

- Replaced `Bun.serve()` with Node.js `http.createServer()` for cross-runtime compatibility
- Build target changed from `bun` to `node` for npm package
- Updated package.json with npm registry configuration

### Fixed

- Auth login callback server now works in Node.js environment

## [0.2.0] - 2025-11-24

### Added

- **Generic API Command** (`databasin api`)
  - Support for all HTTP methods (GET, POST, PUT, DELETE)
  - DELETE with request body support (RFC 7231 compliant)
  - Query parameter handling for GET requests
  - JSON body support for POST/PUT/DELETE requests
  - Comprehensive token efficiency options:
    - `--count` - Returns count only (99.97% token savings)
    - `--summary` - Returns total + sample items
    - `--fields` - Filter to specific fields with nested path support
    - `--limit` / `--offset` - Pagination support
    - `--compact` - Compact JSON output
  - All output formats supported (JSON, CSV, table)
  - 20+ usage examples in help text
- **Enhanced Authentication**
  - `auth whoami` returns full user context by default (account + organizations + projects)
  - `auth login` browser-based authentication flow with local callback server
  - Concurrent API calls for 63% performance improvement (110ms vs 300ms)
  - Graceful degradation with partial failure handling
  - Nested field filtering support (e.g., `account.email`)
  - Secure token storage with proper file permissions
- **SQL Commands** (complete implementation)
  - `sql catalogs` - List available catalogs
  - `sql schemas` - List schemas in catalog
  - `sql tables` - List tables in schema
  - `sql exec` (alias: `sql query`) - Execute SQL queries with result streaming
  - `sql columns` - Discover column information for tables
  - `sql ingestion-types` - Get AI recommendations for column types
- **Automations Commands** (complete CRUD implementation)
  - `automations list` - List all automations with project and status filtering
  - `automations get` - Get automation details
  - `automations run` - Execute automation with progress tracking
  - `automations create` - Create new automation with interactive wizard
  - `automations update` - Update automation configuration
  - `automations stop` - Stop running automation
  - `automations delete` - Delete automation with confirmation

### Changed

- **Improved Code Quality**
  - Refactored apiCommand() complexity
  - Consolidated field filtering logic (eliminated 61 lines of duplication)
  - Removed all process.exit() calls for better testability
  - Enhanced error handling patterns (throw instead of exit)
- **Type Safety**
  - Fixed all TypeScript type errors
  - Full type checking enabled in build
  - Proper OutputFormat type usage throughout

### Fixed

- DELETE method now supports request body (RFC 7231 compliant)
- Field filtering now works on arrays of objects
- Nested path filtering with dot notation (e.g., `organizations.name`)
- Test complexity reduced by removing exit interception harness

### Performance

- Concurrent API execution in whoami (3 endpoints in parallel)
- Token efficiency improvements (up to 99.97% reduction with --count)
- Response size warnings with actionable suggestions

### Implementation Summary

- **30+ commands** across 7 modules
- **Known limitations**: 2 commands with partial implementation
  - `pipelines logs` - Endpoint not yet available
  - `pipelines run --wait` - Polling not yet implemented

### Testing

- **345+ tests passing** (up from 98)
- 86 new tests for API command and enhancements
- Comprehensive test coverage for all token efficiency features
- Integration tests for concurrent operations
- Zero test failures

### Documentation

- Added comprehensive API command documentation
- Created 5 detailed implementation guides
- Updated all command help text with examples

## [0.1.0] - 2024-11-23

### Added

- Initial CLI implementation with Commander.js and Bun
- **Authentication commands**
  - `auth verify` - Verify JWT token validity
  - `auth whoami` - Display current user information
- **Projects commands**
  - `projects list` - List all accessible projects
  - `projects get` - Get detailed project information
  - `projects users` - List project users
  - `projects stats` - Show project statistics
- **Connectors commands**
  - `connectors list` - List connectors with filtering
  - `connectors get` - Get connector details
  - `connectors create` - Create new connector from file
  - `connectors update` - Update connector configuration
  - `connectors delete` - Delete connector with confirmation
- **Pipelines commands**
  - `pipelines list` - List pipelines with filtering
  - `pipelines get` - Get pipeline details
  - `pipelines create` - Create new pipeline from file
  - `pipelines update` - Update pipeline configuration
  - `pipelines run` - Execute pipeline with optional wait
  - `pipelines delete` - Delete pipeline with confirmation
- **Token efficiency optimizations**
  - Field filtering (`--fields`) to reduce response size
  - Pagination support (`--page`, `--limit`)
  - Smart defaults for page sizes
  - Warning system for large datasets
- **Multiple output formats**
  - Table format (default, human-readable)
  - JSON format (`--json`)
  - CSV format (`--csv`)
  - Field selection for all formats
- **Configuration management**
  - Config file support (`~/.databasin/config.json`)
  - Environment variable support
  - CLI flag overrides
  - Priority-based configuration resolution
- **Interactive features**
  - Progress spinners for long operations
  - Interactive prompts for missing arguments
  - Colored output with chalk
  - Confirmation prompts for destructive operations
- **Error handling**
  - Comprehensive error types and codes
  - User-friendly error messages
  - Debug mode with stack traces
  - Token usage warnings
- **Documentation**
  - Comprehensive README with examples
  - Inline JSDoc comments
  - Command help text

### Security

- Secure token storage with 0600 file permissions
- Token validation before API calls
- No secrets logged in debug mode
- Environment variable support for CI/CD

### Performance

- Efficient JSON parsing with native Bun
- Minimal API calls through field filtering
- Smart pagination to reduce token usage
- Response streaming for large datasets

### Developer Experience

- TypeScript with strict type checking
- Comprehensive JSDoc annotations
- Unit tests with Bun test runner
- Example configuration files
- Development mode (`bun run dev`)

## [0.0.1] - 2024-11-15

### Added

- Project scaffolding
- Basic CLI structure
- Commander.js integration
- Initial type definitions

---

### Contributors

Thank you to all contributors who made this release possible!

- Development team at Databasin
- Beta testers who provided valuable feedback
- Community members who reported issues

---

For more information, see the [README](./README.md) or visit [databasin.ai](https://databasin.ai).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
