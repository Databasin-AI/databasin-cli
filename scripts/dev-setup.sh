#!/usr/bin/env bash

# Databasin CLI - Developer Setup Script
# Links/unlinks the CLI globally for development

set -e

cd "$(dirname "$0")/.."

usage() {
    echo "Usage: $0 [link|unlink]"
    echo ""
    echo "Commands:"
    echo "  link    Build and link CLI globally (makes 'databasin' available in PATH)"
    echo "  unlink  Remove global CLI link"
    echo ""
    echo "Examples:"
    echo "  ./scripts/dev-setup.sh link"
    echo "  ./scripts/dev-setup.sh unlink"
}

link_cli() {
    echo "Building CLI..."
    bun run build:exe

    echo ""
    echo "Linking globally..."
    bun link

    echo ""
    echo "Done! 'databasin' is now available globally."
    echo ""
    echo "Test it:"
    echo "  databasin --version"
    echo "  databasin --help"
    echo ""
    echo "To unlink:"
    echo "  ./scripts/dev-setup.sh unlink"
}

unlink_cli() {
    echo "Unlinking CLI..."
    bun unlink 2>/dev/null || npm unlink -g @databasin/cli 2>/dev/null || true
    echo "Done! Global 'databasin' command removed."
}

case "${1:-}" in
    link)
        link_cli
        ;;
    unlink)
        unlink_cli
        ;;
    *)
        usage
        exit 1
        ;;
esac
