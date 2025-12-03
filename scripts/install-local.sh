#!/usr/bin/env bash

# DataBasin CLI - Local Installation Script
# Installs the CLI globally from the local build

set -e

echo "📦 Installing DataBasin CLI locally..."
echo ""

# Change to CLI directory
cd "$(dirname "$0")/.."

# Build first
echo "🔨 Building CLI..."
./scripts/build.sh

# Check if npm link or bun link should be used
if command -v bun &> /dev/null; then
    echo ""
    echo "🔗 Linking with Bun..."
    bun link

    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "The 'databasin' command is now available globally."
    echo ""
    echo "Usage:"
    echo "  databasin --help"
    echo "  databasin auth whoami"
    echo "  databasin projects list"
    echo ""
    echo "To uninstall:"
    echo "  bun unlink"

elif command -v npm &> /dev/null; then
    echo ""
    echo "🔗 Linking with npm..."
    npm link

    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "The 'databasin' command is now available globally."
    echo ""
    echo "Usage:"
    echo "  databasin --help"
    echo "  databasin auth whoami"
    echo "  databasin projects list"
    echo ""
    echo "To uninstall:"
    echo "  npm unlink -g @databasin/cli"

else
    echo "❌ Neither Bun nor npm found!"
    echo "Please install Bun or Node.js/npm first."
    exit 1
fi
