#!/bin/bash
# Schedora Deployment Initialization Script
# Usage: ./deploy.sh [dev|prod]

set -e

ENV_FILE=".env"
COMPOSE_FILE="docker-compose.yml"

colors() {
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    NC='\033[0m'
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}ERROR: Docker is not installed. Install from https://docs.docker.com/get-docker/${NC}"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}ERROR: Docker Compose is not installed.${NC}"
        exit 1
    fi
}

setup_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}Creating .env from template...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✓ .env created. Please edit it with your API keys and settings.${NC}"
        echo -e "${YELLOW}Minimum required: JWT_SECRET, RESEND_API_KEY, GEMINI_API_KEY${NC}"
        exit 0
    else
        echo -e "${GREEN}✓ .env exists.${NC}"
    fi

    # Check for critical variables
    if ! grep -q "JWT_SECRET=.*your_" .env; then
        echo -e "${GREEN}✓ JWT_SECRET appears configured${NC}"
    else
        echo -e "${YELLOW}⚠ JWT_SECRET not configured - set a strong secret!${NC}"
    fi
}

deploy_dev() {
    echo -e "${GREEN}Starting development deployment...${NC}"
    docker-compose up -d
    echo -e "\n${GREEN}✓ Services started${NC}"
    echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
    echo -e "${GREEN}Backend API:${NC} http://localhost:8000"
    echo -e "${GREEN}API Docs:${NC} http://localhost:8000/docs"
    echo -e "\n${YELLOW}View logs: docker-compose logs -f${NC}"
}

deploy_prod() {
    echo -e "${GREEN}Starting production deployment...${NC}"
    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml up -d
        echo -e "\n${GREEN}✓ Production services started${NC}"
    else
        echo -e "${RED}ERROR: docker-compose.prod.yml not found${NC}"
        exit 1
    fi
}

stop_services() {
    echo -e "${YELLOW}Stopping services...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Services stopped${NC}"
}

main() {
    colors

    case "${1:-dev}" in
        dev)
            check_docker
            setup_env
            if [ -f "$ENV_FILE" ] && ! grep -q "your_" "$ENV_FILE"; then
                deploy_dev
            fi
            ;;
        prod)
            check_docker
            setup_env
            if [ -f "$ENV_FILE" ] && ! grep -q "your_" "$ENV_FILE"; then
                deploy_prod
            fi
            ;;
        stop)
            stop_services
            ;;
        init)
            setup_env
            ;;
        *)
            echo "Usage: $0 {dev|prod|stop|init}"
            echo "  dev   - Start development stack"
            echo "  prod  - Start production stack (with resource limits)"
            echo "  stop  - Stop all services"
            echo "  init  - Create .env from template"
            exit 1
            ;;
    esac
}

main "$@"
