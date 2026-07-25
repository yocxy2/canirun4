#!/bin/bash
#
# CanIRun.AI Development Server Start Script
# Fixes port 5000 conflict issues with automatic port fallback
#

set -Eeuo pipefail

# Configuration - try multiple ports in order
DEFAULT_PORTS=(3000 3001 3002 3003 3004 3005)
SELECTED_PORT=""
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
NODE_ENV=development

cd "${COZE_WORKSPACE_PATH}"

# Helper: Print messages
info() { echo -e "\033[36m[INFO]\033[0m $1"; }
success() { echo -e "\033[32m[OK]\033[0m $1"; }
warn() { echo -e "\033[33m[WARN]\033[0m $1"; }
error() { echo -e "\033[31m[ERROR]\033[0m $1"; }

# Check if a port is in use (cross-platform)
check_port_in_use() {
    local port=$1
    local in_use=false

    # Method 1: lsof (macOS, Linux)
    if command -v lsof &>/dev/null; then
        if lsof -Pi :"$port" -sTCP:LISTEN &>/dev/null; then
            return 0
        fi
    fi

    # Method 2: netstat (Windows, Linux)
    if command -v netstat &>/dev/null; then
        if netstat -an 2>/dev/null | grep -q ":$port "; then
            return 0
        fi
    fi

    # Method 3: ss (Linux)
    if command -v ss &>/dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":$port "; then
            return 0
        fi
    fi

    # Method 4: /dev/tcp (Bash fallback)
    if (echo >/dev/tcp/localhost/$port) 2>/dev/null; then
        return 0
    fi

    return 1
}

# Find an available port from the list
find_available_port() {
    local port
    for port in "${DEFAULT_PORTS[@]}"; do
        if ! check_port_in_use "$port"; then
            echo "$port"
            return 0
        else
            warn "Port $port is in use, trying next..."
        fi
    done
    return 1
}

# Main execution
main() {
    info "Searching for available port..."

    SELECTED_PORT=$(find_available_port)
    if [[ -z "$SELECTED_PORT" ]]; then
        error "Could not find an available port from: ${DEFAULT_PORTS[*]}"
        error "Please manually stop processes using these ports."
        exit 1
    fi

    success "Port $SELECTED_PORT is available!"

    info "Starting HTTP service on port $SELECTED_PORT for dev..."
    echo ""
    success "=========================================="
    success "  CanIRun.AI Development Server"
    success "  http://localhost:$SELECTED_PORT"
    success "=========================================="
    echo ""

    # Start Next.js dev server
    exec npx next dev --port "$SELECTED_PORT"
}

main "$@"
