# Changelog

All notable changes to Databasin CLI will be documented in this file.

## [Unreleased]

### Planned

- Config file validation
- Watch mode for log streaming
- Add shell completions (bash/zsh/fish)
- Implement bulk operations from CSV
- Add built-in connector templates

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
