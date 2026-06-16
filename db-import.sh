#!/usr/bin/env bash
# =============================================================================
# db-import.sh — Import PostgreSQL database SQL dump into Docker container
# Kamus Manggarai
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# Helper to load environment variables from .env file safely
load_env() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        log_info "Loading environment from $env_file"
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and empty lines
            if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
                continue
            fi
            # Extract key and value
            if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                local key="${BASH_REMATCH[1]}"
                local value="${BASH_REMATCH[2]}"
                # Strip spaces
                key=$(echo "$key" | xargs)
                value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
                export "$key"="$value"
            fi
        done < "$env_file"
    else
        log_warn "Env file $env_file not found."
    fi
}

# Default values
INPUT_FILE="backup_kamus_dev.sql"
CONTAINER_NAME=""
FORCE=false
HELP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -c|--container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -i|--input)
            INPUT_FILE="$2"
            shift 2
            ;;
        -y|--yes)
            FORCE=true
            shift
            ;;
        -h|--help)
            HELP=true
            shift
            ;;
        *)
            log_error "Unknown option: $1\nUse -h or --help for usage details."
            ;;
    esac
done

if [ "$HELP" = true ]; then
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -c, --container NAME  Specify PostgreSQL Docker container name"
    echo "                        (auto-detects 'kamus_postgres' or 'kamus_postgres_dev' if not set)"
    echo "  -i, --input FILE      Specify input SQL file to import (default: backup_kamus_dev.sql)"
    echo "  -y, --yes             Bypass safety confirmation prompt"
    echo "  -h, --help            Show this help message"
    exit 0
fi

# Ensure input file exists
if [ ! -f "$INPUT_FILE" ]; then
    log_error "Input SQL file '$INPUT_FILE' not found."
fi

# Load variables
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$PROJECT_DIR/.env" ]; then
    load_env "$PROJECT_DIR/.env"
elif [ -f "$PROJECT_DIR/backend/.env" ]; then
    load_env "$PROJECT_DIR/backend/.env"
else
    log_warn "No .env file found in root or backend/. Using default fallback values."
fi

# Fallback values if not set in .env
DB_NAME="${DB_NAME:-kamus_manggarai}"
DB_USER="${DB_USER:-kamus_user}"

# Auto-detect container name if not provided
if [ -z "$CONTAINER_NAME" ]; then
    log_info "Auto-detecting running PostgreSQL container..."
    if docker ps --format '{{.Names}}' | grep -q "^kamus_postgres$"; then
        CONTAINER_NAME="kamus_postgres"
        log_info "Found running production container: $CONTAINER_NAME"
    elif docker ps --format '{{.Names}}' | grep -q "^kamus_postgres_dev$"; then
        CONTAINER_NAME="kamus_postgres_dev"
        log_info "Found running development container: $CONTAINER_NAME"
    else
        log_error "No running PostgreSQL container found (checked 'kamus_postgres' and 'kamus_postgres_dev').\nStart your containers first, or specify one using -c."
    fi
fi

# Ensure the container is actually running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Container '$CONTAINER_NAME' is not running."
fi

log_warn "WARNING: You are about to import data into database '$DB_NAME' inside container '$CONTAINER_NAME'."
log_warn "This operation will drop/overwrite existing database tables!"

# Prompt for confirmation if not forced
if [ "$FORCE" = false ]; then
    read -rp "Are you sure you want to proceed? (type 'yes' to confirm): " confirm
    if [ "$confirm" != "yes" ]; then
        log_error "Operation aborted by user."
    fi
fi

log_info "Importing '$INPUT_FILE' into database '$DB_NAME' inside container '$CONTAINER_NAME'..."

# Execute restore via psql
if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$INPUT_FILE"; then
    log_success "Database imported successfully from $INPUT_FILE"
else
    log_error "Failed to import database."
fi
