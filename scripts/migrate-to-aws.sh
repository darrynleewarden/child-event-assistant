#!/bin/bash

# =============================================================================
# Script to migrate local PostgreSQL data to AWS RDS
# =============================================================================

set -e

echo "=========================================="
echo "Child Event Assistant - Database Migration"
echo "=========================================="

# Configuration
LOCAL_DB_NAME="child_event_assistant"
LOCAL_DB_USER="darryn.lee-warden"
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="5432"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_dependencies() {
    echo -e "\n${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v pg_dump &> /dev/null; then
        echo -e "${RED}Error: pg_dump is not installed${NC}"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}Error: psql is not installed${NC}"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}Error: AWS CLI is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}All dependencies are installed${NC}"
}

# Get AWS database credentials from Secrets Manager
get_aws_credentials() {
    echo -e "\n${YELLOW}Fetching AWS database credentials...${NC}"
    
    # Get the secret ARN from terraform output
    cd "$(dirname "$0")/../infrastructure/dev"
    
    SECRET_ARN=$(terraform output -raw db_secret_arn 2>/dev/null || echo "")
    
    if [ -z "$SECRET_ARN" ]; then
        echo -e "${RED}Error: Could not get database secret ARN from Terraform output${NC}"
        echo "Make sure you have run 'terraform apply' first"
        exit 1
    fi
    
    # Get the secret value
    SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --query SecretString --output text)
    
    AWS_DB_HOST=$(echo "$SECRET_JSON" | jq -r '.host')
    AWS_DB_PORT=$(echo "$SECRET_JSON" | jq -r '.port')
    AWS_DB_NAME=$(echo "$SECRET_JSON" | jq -r '.dbname')
    AWS_DB_USER=$(echo "$SECRET_JSON" | jq -r '.username')
    AWS_DB_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.password')
    
    echo -e "${GREEN}Retrieved AWS database credentials${NC}"
    echo "  Host: $AWS_DB_HOST"
    echo "  Database: $AWS_DB_NAME"
    echo "  Username: $AWS_DB_USER"
    
    cd - > /dev/null
}

# Dump local database
dump_local_db() {
    echo -e "\n${YELLOW}Dumping local database...${NC}"
    
    DUMP_FILE="/tmp/child_event_assistant_dump.sql"
    
    pg_dump -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" \
        --no-owner --no-privileges --clean --if-exists \
        -f "$DUMP_FILE"
    
    if [ -f "$DUMP_FILE" ]; then
        echo -e "${GREEN}Database dumped to $DUMP_FILE${NC}"
        echo "  Size: $(du -h "$DUMP_FILE" | cut -f1)"
    else
        echo -e "${RED}Error: Failed to dump database${NC}"
        exit 1
    fi
}

# Restore to AWS RDS
restore_to_aws() {
    echo -e "\n${YELLOW}Restoring database to AWS RDS...${NC}"
    
    DUMP_FILE="/tmp/child_event_assistant_dump.sql"
    
    export PGPASSWORD="$AWS_DB_PASSWORD"
    
    psql -h "$AWS_DB_HOST" -p "$AWS_DB_PORT" -U "$AWS_DB_USER" -d "$AWS_DB_NAME" \
        -f "$DUMP_FILE"
    
    unset PGPASSWORD
    
    echo -e "${GREEN}Database restored to AWS RDS${NC}"
}

# Run Prisma migrations on AWS database
run_prisma_migrations() {
    echo -e "\n${YELLOW}Running Prisma migrations on AWS database...${NC}"
    
    cd "$(dirname "$0")/.."
    
    # Construct DATABASE_URL
    export DATABASE_URL="postgresql://${AWS_DB_USER}:${AWS_DB_PASSWORD}@${AWS_DB_HOST}:${AWS_DB_PORT}/${AWS_DB_NAME}"
    
    npx prisma migrate deploy
    
    unset DATABASE_URL
    
    echo -e "${GREEN}Prisma migrations completed${NC}"
    
    cd - > /dev/null
}

# Print connection info
print_connection_info() {
    echo -e "\n${GREEN}=========================================="
    echo "Migration Complete!"
    echo "==========================================${NC}"
    
    echo -e "\n${YELLOW}AWS Database Connection Info:${NC}"
    echo "  Host: $AWS_DB_HOST"
    echo "  Port: $AWS_DB_PORT"
    echo "  Database: $AWS_DB_NAME"
    echo "  Username: $AWS_DB_USER"
    
    echo -e "\n${YELLOW}Update your .env file with:${NC}"
    echo "DATABASE_URL=\"postgresql://${AWS_DB_USER}:<password>@${AWS_DB_HOST}:${AWS_DB_PORT}/${AWS_DB_NAME}\""
    
    echo -e "\n${YELLOW}To get the password, run:${NC}"
    echo "aws secretsmanager get-secret-value --secret-id \"$SECRET_ARN\" --query SecretString --output text | jq -r '.password'"
}

# Main execution
main() {
    check_dependencies
    get_aws_credentials
    dump_local_db
    restore_to_aws
    
    echo -e "\n${YELLOW}Would you like to run Prisma migrations? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        run_prisma_migrations
    fi
    
    print_connection_info
}

# Parse command line arguments
case "${1:-}" in
    --dump-only)
        check_dependencies
        dump_local_db
        ;;
    --restore-only)
        check_dependencies
        get_aws_credentials
        restore_to_aws
        ;;
    --migrate-only)
        check_dependencies
        get_aws_credentials
        run_prisma_migrations
        ;;
    --help)
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  (no option)     Full migration: dump, restore, and optionally run Prisma migrations"
        echo "  --dump-only     Only dump the local database"
        echo "  --restore-only  Only restore to AWS (requires prior dump)"
        echo "  --migrate-only  Only run Prisma migrations on AWS"
        echo "  --help          Show this help message"
        ;;
    *)
        main
        ;;
esac
