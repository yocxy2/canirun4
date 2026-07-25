#!/bin/bash
#
# CanIRun.AI Quick Start Script
# Supports: Linux, macOS, WSL, Git Bash
#

set -Eeuo pipefail

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${CYAN}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

# Check if a port is in use
check_port() {
    local port=$1
    if command -v lsof &>/dev/null; then
        lsof -i :"$port" &>/dev/null
    elif command -v netstat &>/dev/null; then
        netstat -tuln 2>/dev/null | grep -q ":$port "
    elif command -v ss &>/dev/null; then
        ss -tuln 2>/dev/null | grep -q ":$port "
    else
        # Fallback: try to connect to the port
        (echo >/dev/tcp/localhost/"$port") 2>/dev/null
    fi
}

# Kill process using a port
kill_port() {
    local port=$1
    local pids

    if command -v lsof &>/dev/null; then
        pids=$(lsof -t -i :"$port" 2>/dev/null || true)
    elif command -v fuser &>/dev/null; then
        pids=$(fuser "$port"/tcp 2>/dev/null || true)
    fi

    if [[ -n "$pids" ]]; then
        echo "$pids" | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
}

echo ""
print_info "=========================================="
print_info "  CanIRun.AI - Quick Start"
print_info "=========================================="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    print_error "[ERROR] Node.js not detected. Please install Node.js first."
    print_info "Download: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "[1/3] ✓ Node.js installed: $NODE_VERSION"

# Check and install pnpm
if ! command -v pnpm &>/dev/null; then
    print_warning "[2/3] ⚠ pnpm not installed, installing..."
    if command -v npm &>/dev/null; then
        npm install -g pnpm
        if [ $? -eq 0 ]; then
            PNPM_VERSION=$(pnpm --version)
            print_success "[2/3] ✓ pnpm installed: $PNPM_VERSION"
        else
            print_error "[ERROR] pnpm installation failed"
            exit 1
        fi
    else
        print_error "[ERROR] npm not installed, cannot install pnpm"
        exit 1
    fi
else
    PNPM_VERSION=$(pnpm --version)
    print_success "[2/3] ✓ pnpm installed: $PNPM_VERSION"
fi

# Check and install dependencies
if [ ! -d "node_modules" ]; then
    print_warning "[3/3] ⚠ Dependencies not installed, installing..."
    pnpm install
    if [ $? -eq 0 ]; then
        print_success "[3/3] ✓ Dependencies installed"
    else
        print_error "[ERROR] Dependencies installation failed"
        exit 1
    fi
else
    print_success "[3/3] ✓ Dependencies installed"
fi

# Check for port conflicts
DEFAULT_PORT=3000
print_info "Checking port $DEFAULT_PORT..."

if check_port $DEFAULT_PORT; then
    print_warning "Port $DEFAULT_PORT is in use."
    print_info "Attempting to kill process on port $DEFAULT_PORT..."
    kill_port $DEFAULT_PORT

    # Check again
    if check_port $DEFAULT_PORT; then
        print_error "Failed to free port $DEFAULT_PORT. Please manually stop the process using this port."
        print_info "You can find the process with: lsof -i :$DEFAULT_PORT"
        exit 1
    else
        print_success "Port $DEFAULT_PORT is now free."
    fi
else
    print_success "Port $DEFAULT_PORT is available."
fi

echo ""
print_info "=========================================="
print_info "  Starting development server..."
print_info "  Address: http://localhost:$DEFAULT_PORT"
print_info "=========================================="
echo ""

# Start development server
pnpm dev
