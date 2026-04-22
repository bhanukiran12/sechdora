FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY frontend/package*.json frontend/yarn.lock* ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

RUN apt-get update && apt-get install -y nginx supervisor && rm -rf /var/lib/apt/lists/*

RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf
RUN cp -r /app/build/. /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/templates/default.conf.template
sed -i 's/--port 8080/--port 8000/g' Dockerfile.backend
COPY start.sh /start.sh
RUN chmod +x /start.sh

RUN echo '[supervisord]' > /etc/supervisor/conf.d/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:uvicorn]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=python -m uvicorn server:app --host 127.0.0.1 --port 8000' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:nginx]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=/start.sh' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80 8000

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
