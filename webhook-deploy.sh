#!/bin/bash

# GitHub Webhook Handler
# Usage: nohup ./webhook-deploy.sh &

PORT=9000
SECRET=your_github_webhook_secret
REPO_DIR=/root/sechdora

handle_request() {
    local request="$1"
    
    # Check if it's a push event
    if echo "$request" | grep -q "X-GitHub-Event: push"; then
        echo "[$(date)] Push event received, deploying..."
        cd "$REPO_DIR"
        git fetch origin main
        git reset --hard origin/main
        docker compose -f docker-compose.prod.yml up -d --build
        echo "[$(date)] Deployment complete!"
        return 0
    fi
    return 1
}

echo "Starting webhook listener on port $PORT..."

# Use socat or nc to listen
while true; do
    # Read incoming request
    REQUEST=$(timeout 5 nc -l -p $PORT 2>/dev/null || echo "")
    
    if [ -n "$REQUEST" ]; then
        handle_request "$REQUEST"
    fi
done