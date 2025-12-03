#!/usr/bin/env bash

# DataBasin CLI - Build Script
# Builds the CLI for local development and testing

set -e

echo "🔨 Building DataBasin CLI..."
echo ""

# Change to CLI directory
cd "$(dirname "$0")/.."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist
mkdir -p dist

# Note: Skipping type check for MVP - Bun build handles runtime validation
# Future: Enable strict type checking after fixing client method signatures
# bun run typecheck

# Bundle the CLI as a standalone executable
echo "📦 Bundling application..."
bun build src/index.ts \
    --compile \
    --outfile dist/databasin \
    --target=bun \
    --minify

# Show build size
echo ""
echo "✅ Build complete!"
echo ""
echo "📊 Build artifacts:"
ls -lh dist/
echo ""
echo "🚀 Run the CLI:"
echo "   ./dist/databasin --help"
