#!/usr/bin/env bash

set -e

# DataBasin CLI Release Script
# Bumps version, creates a commit and tag, then pushes to remote

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

highlight() {
    echo -e "${BLUE}$1${NC}"
}

# Show usage
usage() {
    cat << EOF
Usage: $0 <version|bump-type> [options]

Arguments:
  version       Specific version (e.g., 1.2.3)
  bump-type     One of: major, minor, patch

Options:
  --no-push     Don't push to remote (useful for testing)
  --dry-run     Show what would be done without making changes
  -h, --help    Show this help message

Examples:
  $0 1.2.3              # Release version 1.2.3
  $0 patch              # Bump patch version (0.2.0 -> 0.2.1)
  $0 minor              # Bump minor version (0.2.0 -> 0.3.0)
  $0 major              # Bump major version (0.2.0 -> 1.0.0)
  $0 patch --no-push    # Bump version but don't push
  $0 patch --dry-run    # Show what would happen

EOF
    exit 1
}

# Parse command line arguments
BUMP_TYPE=""
VERSION=""
NO_PUSH=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        major|minor|patch)
            BUMP_TYPE=$1
            shift
            ;;
        --no-push)
            NO_PUSH=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        [0-9]*.[0-9]*.[0-9]*)
            VERSION=$1
            shift
            ;;
        *)
            error "Unknown argument: $1"
            usage
            ;;
    esac
done

# Validate arguments
if [ -z "$BUMP_TYPE" ] && [ -z "$VERSION" ]; then
    error "Please specify a version or bump type (major, minor, patch)"
    usage
fi

# Check if we're in a git repository
if [ ! -d .git ]; then
    error "Not in a git repository"
fi

# Check if working directory is clean
if [ "$DRY_RUN" = false ] && [ -n "$(git status --porcelain)" ]; then
    error "Working directory is not clean. Please commit or stash your changes first."
fi

# Get current version from package.json
get_current_version() {
    if [ ! -f package.json ]; then
        error "package.json not found"
    fi

    # Extract version using grep and sed
    local version=$(grep '"version"' package.json | head -n 1 | sed 's/.*"version": "\(.*\)".*/\1/')

    if [ -z "$version" ]; then
        error "Could not extract version from package.json"
    fi

    echo "$version"
}

# Bump version based on type
bump_version() {
    local current=$1
    local bump_type=$2

    IFS='.' read -r major minor patch <<< "$current"

    case $bump_type in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
        *)
            error "Invalid bump type: $bump_type"
            ;;
    esac

    echo "${major}.${minor}.${patch}"
}

# Update package.json version
update_package_json() {
    local new_version=$1

    info "Updating package.json to version ${new_version}..."

    if [ "$DRY_RUN" = true ]; then
        highlight "[DRY RUN] Would update package.json version to ${new_version}"
        return
    fi

    # Use sed to update version in package.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed requires empty string after -i
        sed -i '' "s/\"version\": \".*\"/\"version\": \"${new_version}\"/" package.json
    else
        # Linux sed
        sed -i "s/\"version\": \".*\"/\"version\": \"${new_version}\"/" package.json
    fi

    info "Updated package.json"
}

# Create git commit
create_commit() {
    local version=$1

    info "Creating commit for version ${version}..."

    if [ "$DRY_RUN" = true ]; then
        highlight "[DRY RUN] Would create commit: 'chore: bump version to ${version}'"
        return
    fi

    git add package.json

    git commit -m "chore: bump version to ${version}"

    info "Created commit"
}

# Create git tag
create_tag() {
    local version=$1
    local tag_name="v${version}"

    info "Creating tag ${tag_name}..."

    if [ "$DRY_RUN" = true ]; then
        highlight "[DRY RUN] Would create tag: ${tag_name}"
        return
    fi

    git tag -a "${tag_name}" -m "Release ${tag_name}"

    info "Created tag ${tag_name}"
}

# Push to remote
push_to_remote() {
    local version=$1
    local tag_name="v${version}"

    if [ "$NO_PUSH" = true ]; then
        warn "Skipping push (--no-push flag set)"
        echo ""
        info "To push manually, run:"
        highlight "  git push origin main"
        highlight "  git push origin ${tag_name}"
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        highlight "[DRY RUN] Would push commit and tag to remote"
        return
    fi

    info "Pushing to remote..."

    # Get current branch
    local current_branch=$(git rev-parse --abbrev-ref HEAD)

    # Push commit
    info "Pushing commit to ${current_branch}..."
    git push origin "${current_branch}" || error "Failed to push commit"

    # Push tag
    info "Pushing tag ${tag_name}..."
    git push origin "${tag_name}" || error "Failed to push tag"

    info "Pushed to remote successfully"
}

# Main release flow
main() {
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║   DataBasin CLI Release Script        ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    # Get current version
    local current_version=$(get_current_version)
    info "Current version: ${current_version}"

    # Determine new version
    local new_version=""
    if [ -n "$VERSION" ]; then
        new_version="$VERSION"
        info "Releasing specific version: ${new_version}"
    else
        new_version=$(bump_version "$current_version" "$BUMP_TYPE")
        info "Bumping ${BUMP_TYPE} version: ${current_version} → ${new_version}"
    fi

    echo ""

    # Confirm unless dry run
    if [ "$DRY_RUN" = false ]; then
        read -p "Proceed with release v${new_version}? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Release cancelled"
        fi
        echo ""
    fi

    # Update package.json
    update_package_json "$new_version"

    # Create commit
    create_commit "$new_version"

    # Create tag
    create_tag "$new_version"

    # Push to remote
    push_to_remote "$new_version"

    echo ""
    info "Release complete! 🎉"
    echo ""

    if [ "$DRY_RUN" = false ] && [ "$NO_PUSH" = false ]; then
        highlight "Version ${new_version} has been released and pushed to remote."
        highlight "The GitHub Actions workflow will now:"
        echo "  • Build the CLI for all platforms"
        echo "  • Run tests and type checking"
        echo "  • Publish to npm as @databasin/cli@${new_version}"
        echo "  • Create a GitHub release with artifacts"
        echo ""
        info "Monitor the workflow at: https://github.com/Databasin-AI/databasin-cli/actions"
    elif [ "$DRY_RUN" = true ]; then
        highlight "Dry run complete. No changes were made."
    fi

    echo ""
}

# Run main function
main
