#!/bin/bash

# Simple webhook listener for GitHub pushes
# Run with: nohup ./webhook.sh &

PORT=9000
SECRET=your_webhook_secret

echo "Listening on port $PORT..."

while true; do
    PAYLOAD=$(cat)
    if echo "$PAYLOAD" | grep -q "push"; then
        echo "Push detected, deploying..."
        cd /root/sechdora
        git fetch origin main
        git reset --hard origin/main
        docker compose -f docker-compose.prod.yml up -d --build
        echo "Deployed!"
    fi
done | nc -l -p $PORT -k