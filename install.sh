#!/usr/bin/env bash

set -e

# Databasin CLI Installation Script
# Downloads and installs the latest release binary for your platform

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="Databasin-AI/databasin-cli"
BINARY_NAME="databasin"

# Default to user installation (no sudo required)
GLOBAL_INSTALL=false
DEFAULT_USER_DIR="${HOME}/.local/bin"
DEFAULT_SYSTEM_DIR="/usr/local/bin"

# Helper functions
info() {
    echo -e "${GREEN}[INFO]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

highlight() {
    echo -e "${BLUE}$1${NC}" >&2
}

# Show usage
usage() {
    cat << EOF
Databasin CLI Installation Script

Installs the Databasin CLI to your system. By default, installs to ~/.local/bin
which doesn't require sudo. Use --global to install system-wide.

Usage:
  curl -fsSL https://raw.githubusercontent.com/Databasin-AI/databasin-cli/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/Databasin-AI/databasin-cli/main/install.sh | bash -s -- --global

Options:
  --global          Install system-wide to /usr/local/bin (requires sudo)
  --dir <path>      Install to custom directory
  -h, --help        Show this help message

Examples:
  # User installation (default, no sudo)
  curl -fsSL https://[...]/install.sh | bash

  # System-wide installation (requires sudo)
  curl -fsSL https://[...]/install.sh | bash -s -- --global

  # Custom directory
  curl -fsSL https://[...]/install.sh | bash -s -- --dir ~/bin

Environment Variables:
  INSTALL_DIR       Override installation directory

EOF
    exit 0
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --global)
                GLOBAL_INSTALL=true
                shift
                ;;
            --dir)
                CUSTOM_INSTALL_DIR="$2"
                shift 2
                ;;
            -h|--help)
                usage
                ;;
            *)
                error "Unknown option: $1. Use --help for usage information."
                ;;
        esac
    done
}

# Determine installation directory
get_install_dir() {
    # Priority: Custom dir > Environment variable > Global flag > Default user dir
    if [ -n "$CUSTOM_INSTALL_DIR" ]; then
        echo "$CUSTOM_INSTALL_DIR"
    elif [ -n "$INSTALL_DIR" ]; then
        echo "$INSTALL_DIR"
    elif [ "$GLOBAL_INSTALL" = true ]; then
        echo "$DEFAULT_SYSTEM_DIR"
    else
        echo "$DEFAULT_USER_DIR"
    fi
}

# Detect OS and Architecture
detect_platform() {
    local os=""
    local arch=""

    # Detect OS
    case "$(uname -s)" in
        Linux*)
            os="linux"
            ;;
        Darwin*)
            os="darwin"
            ;;
        *)
            error "Unsupported operating system: $(uname -s)"
            ;;
    esac

    # Detect Architecture
    case "$(uname -m)" in
        x86_64)
            arch="x64"
            ;;
        arm64|aarch64)
            arch="arm64"
            ;;
        *)
            error "Unsupported architecture: $(uname -m)"
            ;;
    esac

    echo "${os}-${arch}"
}

# Get latest release version
get_latest_version() {
    local api_url="https://api.github.com/repos/${REPO}/releases/latest"

    info "Fetching latest release information..."

    if command -v curl &> /dev/null; then
        version=$(curl -s "${api_url}" | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
    elif command -v wget &> /dev/null; then
        version=$(wget -qO- "${api_url}" | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
    else
        error "Neither curl nor wget is available. Please install one of them."
    fi

    if [ -z "$version" ]; then
        error "Failed to fetch latest version"
    fi

    echo "$version"
}

# Download binary
download_binary() {
    local version=$1
    local platform=$2
    # Binary names in GitHub releases include the platform suffix
    local asset_name="${BINARY_NAME}-${platform}"
    local download_url="https://github.com/${REPO}/releases/download/v${version}/${asset_name}"
    local temp_file="/tmp/${BINARY_NAME}-${version}"

    info "Downloading Databasin CLI v${version} for ${platform}..."
    info "Asset: ${asset_name}"

    if command -v curl &> /dev/null; then
        curl -fL -o "${temp_file}" "${download_url}" || error "Failed to download binary. Check if release v${version} has asset '${asset_name}'"
    elif command -v wget &> /dev/null; then
        wget -O "${temp_file}" "${download_url}" || error "Failed to download binary. Check if release v${version} has asset '${asset_name}'"
    fi

    echo "${temp_file}"
}

# Install binary
install_binary() {
    local temp_file=$1
    local install_dir=$2
    local install_path="${install_dir}/${BINARY_NAME}"

    info "Installing to ${install_path}..."

    # Create install directory if it doesn't exist
    if [ ! -d "$install_dir" ]; then
        if [ "$GLOBAL_INSTALL" = true ]; then
            info "Creating system directory ${install_dir} (requires sudo)..."
            sudo mkdir -p "$install_dir"
        else
            info "Creating user directory ${install_dir}..."
            mkdir -p "$install_dir"
        fi
    fi

    # Install based on permissions
    if [ "$GLOBAL_INSTALL" = true ] || [ ! -w "$install_dir" ]; then
        if [ "$GLOBAL_INSTALL" = false ]; then
            warn "Install directory requires elevated privileges. Using sudo..."
        fi
        sudo cp "${temp_file}" "${install_path}"
        sudo chmod +x "${install_path}"
    else
        cp "${temp_file}" "${install_path}"
        chmod +x "${install_path}"
    fi

    # Verify installation
    if [ -x "${install_path}" ]; then
        info "Installation successful!"
    else
        error "Installation failed. Binary is not executable at ${install_path}"
    fi

    # Clean up
    rm -f "${temp_file}"
}

# Verify installation
verify_installation() {
    local install_dir=$1

    info "Verifying installation..."

    if command -v ${BINARY_NAME} &> /dev/null; then
        local installed_version=$(${BINARY_NAME} --version 2>&1 | head -n1 || echo "unknown")
        info "Databasin CLI installed successfully!"
        echo ""
        echo "  Version: ${installed_version}"
        echo "  Location: $(which ${BINARY_NAME})"
        echo ""
        info "Run '${BINARY_NAME} --help' to get started"
    else
        warn "Binary installed but not found in PATH"

        if [ "$GLOBAL_INSTALL" = false ]; then
            echo ""
            highlight "To use the Databasin CLI, add ${install_dir} to your PATH:"
            echo ""

            # Detect shell and provide specific instructions
            if [ -n "$BASH_VERSION" ]; then
                echo "  For Bash, add to ~/.bashrc:"
                echo "    echo 'export PATH=\"${install_dir}:\$PATH\"' >> ~/.bashrc"
                echo "    source ~/.bashrc"
            elif [ -n "$ZSH_VERSION" ]; then
                echo "  For Zsh, add to ~/.zshrc:"
                echo "    echo 'export PATH=\"${install_dir}:\$PATH\"' >> ~/.zshrc"
                echo "    source ~/.zshrc"
            else
                echo "  Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
                echo "    export PATH=\"${install_dir}:\$PATH\""
            fi

            echo ""
            highlight "Or run directly:"
            echo "  ${install_dir}/${BINARY_NAME} --help"
        else
            echo ""
            echo "Add ${install_dir} to your PATH or verify that it's already included."
        fi
    fi
}

# Main installation flow
main() {
    # Parse command line arguments
    parse_args "$@"

    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║   Databasin CLI Installation Script  ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    # Determine installation directory
    local install_dir=$(get_install_dir)

    if [ "$GLOBAL_INSTALL" = true ]; then
        info "Installing globally to ${install_dir} (requires sudo)"
    else
        info "Installing for current user to ${install_dir} (no sudo required)"
    fi

    # Detect platform
    local platform=$(detect_platform)
    info "Detected platform: ${platform}"

    # Get latest version
    local version=$(get_latest_version)
    info "Latest version: v${version}"

    # Download binary
    local temp_file=$(download_binary "${version}" "${platform}")

    # Install binary
    install_binary "${temp_file}" "${install_dir}"

    # Verify
    verify_installation "${install_dir}"

    echo ""
    info "Installation complete! 🎉"
    echo ""
}

# Run main function with all script arguments
main "$@"
