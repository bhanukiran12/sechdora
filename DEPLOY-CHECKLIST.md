# Schedora Deployment Checklist

## Pre-Deployment

### Environment Variables (Required)
- [ ] `JWT_SECRET` - Generate with: `openssl rand -base64 64`
- [ ] `RESEND_API_KEY` - From Resend dashboard
- [ ] `GEMINI_API_KEY` - From Google AI Studio / Gemini API
- [ ] `SENDER_EMAIL` - Verified sender email
- [ ] `MONGO_ROOT_PASSWORD` - Strong password for MongoDB
- [ ] `FRONTEND_URL` - Your domain (e.g., https://app.schedora.com)

### Optional: OAuth Platforms (Configure as needed)
- [ ] INSTAGRAM_CLIENT_ID / SECRET / REDIRECT_URI
- [ ] FACEBOOK_CLIENT_ID / SECRET / REDIRECT_URI
- [ ] TWITTER_CLIENT_ID / SECRET / REDIRECT_URI
- [ ] LINKEDIN_CLIENT_ID / SECRET / REDIRECT_URI
- [ ] YOUTUBE_CLIENT_ID / SECRET / REDIRECT_URI

### Infrastructure
- [ ] Docker installed (v20.10+)
- [ ] Docker Compose installed (v2.0+)
- [ ] Ports 80, 3000, 8000 available (or configure alternate ports)
- [ ] HTTPS certificate ready (Let's Encrypt / custom)

---

## Development Deployment

```bash
cp .env.example .env
# Edit .env with your values
./deploy.sh dev  # or deploy.bat dev on Windows
```

Verify:
- [ ] http://localhost:3000 loads frontend
- [ ] http://localhost:8000/docs shows API docs
- [ ] Can register/login
- [ ] Can create a test post

---

## Production Deployment

### 1. MongoDB Atlas (Recommended)
- [ ] Create MongoDB Atlas cluster
- [ ] Whitelist IP (0.0.0.0/0 for testing, restrict for prod)
- [ ] Get connection string
- [ ] Update `.env`:
  ```env
  MONGO_URL=mongodb+srv://...connection string...
  DB_NAME=schedora
  ```

### 2. SSL/TLS Setup
- [ ] Obtain SSL certificate (Let's Encrypt / commercial)
- [ ] Configure Nginx reverse proxy with SSL
- [ ] Update `FRONTEND_URL` to `https://yourdomain.com`

### 3. Domain & DNS
- [ ] Point domain DNS to server IP
- [ ] Wait for DNS propagation

### 4. Firewall & Security
- [ ] Open ports: 80, 443, 8000 (if needed for API)
- [ ] Configure UFW/iptables
- [ ] Enable fail2ban (optional)

### 5. Deploy
```bash
./deploy.sh prod  # or docker-compose -f docker-compose.prod.yml up -d
```

### 6. Post-Deploy Verification
- [ ] Frontend accessible
- [ ] Can register and login
- [ ] OAuth connections work (if configured)
- [ ] Email notifications sent (test)
- [ ] Scheduled posts work (create test post 2 min in future)
- [ ] Backend health endpoint responds

---

## Monitoring & Maintenance

### Daily
- [ ] Check docker-compose logs for errors
- [ ] Monitor disk space (`docker system df`)

### Weekly
- [ ] Review failed posts in dashboard
- [ ] Check email deliverability
- [ ] Backup MongoDB

### Monthly
- [ ] Rotate API keys if needed
- [ ] Update Docker images
- [ ] Review analytics for anomalies

---

## Backup Strategy

### Automated Daily Backup (cron job)
```bash
# /etc/cron.daily/schedora-backup
#!/bin/bash
cd /path/to/schedora
docker-compose exec -T mongodb mongodump --uri="mongodb://admin:password@localhost:27017" --out=/backup/backup-$(date +%Y%m%d)
docker cp schedora_mongodb:/backup ./backups/
find ./backups -mtime +30 -delete  # Keep 30 days
```

### Restore
```bash
docker-compose exec mongodb mongorestore --uri="mongodb://admin:password@localhost:27017" /backup
```

---

## Scaling

### Scale Backend
```bash
# Update nginx.conf to load balance
upstream backend {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

# Scale containers
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Add Redis (for distributed scheduler)
Add to `docker-compose.prod.yml`:
```yaml
  redis:
    image: redis:7-alpine
    container_name: schedora_redis
    networks:
      - schedora_network
```

Update backend to use Redis for APScheduler (requires code change).

---

## Troubleshooting

### Backend won't start
```bash
docker-compose logs backend | head -50
docker-compose exec backend python -c "import uvicorn; print('OK')"  # Test Python
```

### MongoDB connection refused
```bash
docker-compose logs mongodb
docker-compose exec mongodb mongosh -u admin -p
```

### Frontend blank page
```bash
docker-compose logs frontend
docker-compose exec frontend ls /usr/share/nginx/html  # Check build exists
```

### OAuth errors
- Check redirect URI matches exactly in platform developer console
- Verify OAuth credentials in `.env`
- Check backend logs for error details

---

## Security Hardening

### Production .env Security
- [ ] Generate strong secrets (min 32 chars)
- [ ] Use MongoDB Atlas with IP restrictions
- [ ] Enable SSL/TLS everywhere
- [ ] Set secure cookies (HTTPS only)
- [ ] Configure CORS to specific domain
- [ ] Regular JWT secret rotation plan
- [ ] Enable MongoDB authentication
- [ ] Use secrets manager (AWS Secrets Manager, HashiCorp Vault)

### Docker Security
- [ ] Use specific version tags (not :latest)
- [ ] Scan images for vulnerabilities
- [ ] Run as non-root user in Dockerfiles (future enhancement)
- [ ] Set resource limits

---

## Support

- GitHub Issues: https://github.com/bhanukiran12/sechdora/issues
- Documentation: See `docs/` folder for OAuth setup guides
