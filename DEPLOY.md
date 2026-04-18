# Schedora Deployment Guide

## Recommended Split Deployment
- Frontend: Netlify static site
- Backend: Render web service
- Database: MongoDB Atlas

## Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/bhanukiran12/sechdora.git
cd sechdora
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env  # or use any editor
```

**Minimum required variables for the backend:**
```env
JWT_SECRET=your_random_64_char_secret_here
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_API_KEY=your_gemini_api_key_here
SENDER_EMAIL=your_verified_sender@yourdomain.com
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
FRONTEND_URL=https://your-site.netlify.app
```

### 3. Deploy Frontend to Netlify
1. Connect the Git repository in Netlify.
2. Set the base directory to `frontend`.
3. Set the build command to `npm run build`.
4. Set the publish directory to `build`.
5. Add the environment variable `REACT_APP_BACKEND_URL` with your Render backend URL.
6. Deploy. Netlify will use the SPA rewrite in [netlify.toml](./netlify.toml).

### 4. Deploy Backend to Render
1. Create a new Web Service from this repository.
2. Point Render at the `backend` directory, or use [render.yaml](./render.yaml).
3. Set build command: `pip install -r requirements.txt`.
4. Set start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`.
5. Add the env vars from `.env` in the Render dashboard.
6. Use MongoDB Atlas for `MONGO_URL`.
7. Set `FRONTEND_URL` to your Netlify URL.

## MongoDB Atlas Setup (Recommended for Production)

1. Create free cluster at mongodb.com/atlas
2. Get connection string:
   `mongodb+srv://username:password@cluster.mongodb.net/`
3. Update `.env`:
   ```env
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
   DB_NAME=schedora
   ```

## OAuth Configuration

For each social platform, create an OAuth app:

- **Callback URL**: `https://yourdomain.com/settings/accounts` (or `http://localhost:3000/settings/accounts` for dev)
- **Set environment variables** with credentials from each platform

See `docs/oauth-setup-*.md` for detailed guides per platform.

## Scaling & Monitoring

### Horizontal Scaling
- Backend should stay as one always-on web service because it runs the in-process scheduler.
- If you need background jobs later, move them to a separate worker or queue.

### Health Checks
- Backend: `GET /health` returns `{"status":"healthy"}`
- Render health check path: `/health`

### Logs & Monitoring
```bash
# View Render logs in the dashboard
# Use Netlify deploy logs from the Netlify dashboard
```

### Backup MongoDB
```bash
# Backup and restore from MongoDB Atlas tools or `mongodump` against the Atlas connection string
```

## Troubleshooting

### Backend fails to start
- Check Render service logs.
- Verify `MONGO_URL`, `JWT_SECRET`, and `GEMINI_API_KEY` are set.
- Make sure the start command binds to `0.0.0.0` and uses `$PORT`.

### Frontend can't connect to API
- Check Netlify `REACT_APP_BACKEND_URL` points to the Render URL.
- Verify `FRONTEND_URL` in Render matches the Netlify site URL.
- Ensure the backend CORS origin matches the frontend URL.

### OAuth errors
- Verify redirect URIs match exactly in OAuth app settings
- Check OAuth environment variables are loaded
- Review platform-specific docs in `docs/`

### MongoDB connection refused
- Wait 10-30 seconds after `docker-compose up` for MongoDB to initialize
- Use `docker-compose logs -f mongodb` to see when it's ready
- Backend has healthcheck dependency, but manual start may need wait

## Security Checklist

- [ ] Change default JWT_SECRET (min 32 random chars)
- [ ] Use MongoDB Atlas with IP restrictions
- [ ] Configure HTTPS on Netlify and Render
- [ ] Set secure OAuth redirect URIs
- [ ] Rotate API keys periodically
- [ ] Use environment variables, never commit `.env`
- [ ] Configure CORS to the exact Netlify origin

## Uninstall
```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove images
docker rmi $(docker images -f "reference=schedora*" -q) 2>/dev/null || true

# Cleanup unused Docker resources
docker system prune -a
```
