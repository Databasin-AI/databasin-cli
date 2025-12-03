#!/usr/bin/env bash

# DataBasin CLI - Development Runner
# Runs the CLI directly from source without building

# Change to CLI directory
cd "$(dirname "$0")/.."

# Run with bun
exec bun run src/index.ts "$@"
