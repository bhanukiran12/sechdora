#!/bin/bash

set -e

echo "Fetching latest changes..."
cd /root/sechdora

git fetch origin main
git reset --hard origin/main

echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Cleaning up old images..."
docker image prune -f

echo "Done! App is updated."