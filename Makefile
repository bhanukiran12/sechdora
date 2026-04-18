.PHONY: help dev prod stop logs clean test-build

# Default target
help:
	@echo "Schedora - Docker Deployment Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start development stack"
	@echo "  make prod           - Start production stack"
	@echo "  make stop           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo ""
	@echo "Logs & Monitoring:"
	@echo "  make logs           - Show all logs (follow)"
	@echo "  make logs-backend   - Show backend logs"
	@echo "  make logs-frontend  - Show frontend logs"
	@echo "  make logs-mongodb   - Show MongoDB logs"
	@echo "  make stats          - Show container resource usage"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          - Stop and remove all containers and volumes"
	@echo "  make backup-mongo   - Backup MongoDB database"
	@echo "  make restore-mongo  - Restore MongoDB from backup"
	@echo "  make shell-backend  - Open shell in backend container"
	@echo "  make shell-mongodb  - Open shell in MongoDB container"
	@echo ""
	@echo "Build & Deploy:"
	@echo "  make build          - Build all images"
	@echo "  make rebuild        - Rebuild and restart"
	@echo "  make test-build     - Test Docker build without running"

dev:
	docker-compose up -d

prod:
	docker-compose -f docker-compose.prod.yml up -d

stop:
	docker-compose down

restart: stop dev

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-mongodb:
	docker-compose logs -f mongodb

stats:
	docker stats schedora_backend schedora_frontend schedora_mongodb

clean:
	docker-compose down -v
	docker system prune -f

build:
	docker-compose build

rebuild: clean build dev

test-build:
	docker-compose config --quiet

backup-mongo:
	mkdir -p backups
	docker exec schedora_mongodb mongodump --uri="mongodb://admin:$$(grep MONGO_ROOT_PASSWORD .env | cut -d'=' -f2)@localhost:27017" --out=/backup/backup-$$(date +%%Y%%m%%d_%%H%%M%%S)
	docker cp schedora_mongodb:/backup ./backups/backup-$$(date +%Y%m%d_%H%M%S)
	@echo "Backup saved to backups/backup-$$(date +%Y%m%d_%H%M%S)"

shell-backend:
	docker exec -it schedora_backend /bin/bash

shell-mongodb:
	docker exec -it schedora_mongodb mongosh -u admin -p $$(grep MONGO_ROOT_PASSWORD .env | cut -d'=' -f2) --authenticationDatabase admin

health:
	@curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/health

mongo-connect:
	@echo "MongoDB connection string:"
	@echo "mongodb://admin:$$(grep MONGO_ROOT_PASSWORD .env | cut -d'=' -f2)@localhost:27017/schedora"
