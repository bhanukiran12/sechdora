FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy frontend package files
COPY frontend/package*.json frontend/yarn.lock* ./

# Install frontend dependencies
RUN npm install --legacy-peer-deps

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ ./backend/

# Install nginx
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create startup script
RUN echo '#!/bin/bash' > /start.sh && \
    echo '/usr/sbin/nginx -g "daemon off;" &' >> /start.sh && \
    echo 'exec python -m uvicorn server:app --host 0.0.0.0 --port 8080' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 80 8080

CMD ["/start.sh"]