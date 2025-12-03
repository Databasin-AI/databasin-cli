#!/usr/bin/env bash

set -e

# Databasin CLI Installation Script
# Downloads and installs the latest release binary for your platform

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="Databasin-AI/databasin-cli"
BINARY_NAME="databasin"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

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
    local download_url="https://github.com/${REPO}/releases/download/v${version}/${BINARY_NAME}"
    local temp_file="/tmp/${BINARY_NAME}-${version}"

    info "Downloading Databasin CLI v${version} for ${platform}..."

    # Adjust URL based on platform
    # The release has platform-specific paths in the artifacts
    case "$platform" in
        linux-x64)
            download_url="https://github.com/${REPO}/releases/download/v${version}/${BINARY_NAME}"
            ;;
        darwin-arm64|darwin-x64)
            download_url="https://github.com/${REPO}/releases/download/v${version}/${BINARY_NAME}"
            ;;
    esac

    if command -v curl &> /dev/null; then
        curl -L -o "${temp_file}" "${download_url}" || error "Failed to download binary"
    elif command -v wget &> /dev/null; then
        wget -O "${temp_file}" "${download_url}" || error "Failed to download binary"
    fi

    echo "${temp_file}"
}

# Install binary
install_binary() {
    local temp_file=$1
    local install_path="${INSTALL_DIR}/${BINARY_NAME}"

    info "Installing to ${install_path}..."

    # Check if install directory exists and is writable
    if [ ! -d "$INSTALL_DIR" ]; then
        error "Install directory ${INSTALL_DIR} does not exist. Please create it or run with sudo."
    fi

    # Try to install, use sudo if necessary
    if [ -w "$INSTALL_DIR" ]; then
        cp "${temp_file}" "${install_path}"
        chmod +x "${install_path}"
    else
        warn "Install directory requires elevated privileges. Using sudo..."
        sudo cp "${temp_file}" "${install_path}"
        sudo chmod +x "${install_path}"
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
        warn "You may need to add ${INSTALL_DIR} to your PATH"
        echo ""
        echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
        echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
    fi
}

# Main installation flow
main() {
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║   Databasin CLI Installation Script  ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    # Detect platform
    local platform=$(detect_platform)
    info "Detected platform: ${platform}"

    # Get latest version
    local version=$(get_latest_version)
    info "Latest version: v${version}"

    # Download binary
    local temp_file=$(download_binary "${version}" "${platform}")

    # Install binary
    install_binary "${temp_file}"

    # Verify
    verify_installation

    echo ""
    info "Installation complete! 🎉"
    echo ""
}

# Run main function
main
