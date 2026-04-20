# Schedora - Social Media Management Platform

## Overview
Schedora is a social media management and automation platform. Users can create, schedule, and automate posts across Instagram, Facebook, Twitter, LinkedIn, and YouTube. Key features include AI-driven content generation (Gemini), a drag-and-drop calendar, bulk CSV uploading, and an admin panel for team collaboration.

## Architecture

### Frontend (React + CRACO)
- **Framework**: React 19 with Create React App (via CRACO override)
- **Styling**: Tailwind CSS + Shadcn/UI components
- **Routing**: React Router DOM v7
- **Location**: `frontend/`
- **Port**: 5000 (dev server on 0.0.0.0)
- **Entry**: `frontend/src/App.js`
- **Start**: `cd frontend && yarn start`

### Backend (FastAPI + Python)
- **Framework**: FastAPI with uvicorn
- **Database**: MongoDB (via Motor async driver) — external Atlas cluster
- **AI**: Google Gemini (`google-generativeai`)
- **Scheduling**: APScheduler
- **Auth**: JWT + Google OAuth
- **Location**: `backend/`
- **Port**: 8000 (localhost)
- **Entry**: `backend/server.py`
- **Start**: `cd backend && uvicorn server:app --host localhost --port 8000 --reload`

## Environment Variables
- `REACT_APP_BACKEND_URL` — Backend API URL (default: `http://localhost:8000`)
- `PORT` — Frontend port (5000)
- `MONGO_URL` — MongoDB connection string (has default in server.py)
- `DB_NAME` — MongoDB database name (default: `schedoradb`)
- `GEMINI_API_KEY` — Google Gemini API key
- `JWT_SECRET` — JWT signing secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` — Email config
- `RESEND_API_KEY` — Resend email API key

## Workflows
- **Start application** — Frontend dev server on port 5000 (webview)
- **Backend API** — FastAPI backend on port 8000 (console)

## Deployment
- **Target**: Autoscale
- **Build**: `cd frontend && yarn build`
- **Run**: `cd backend && uvicorn server:app --host 0.0.0.0 --port 8000`
- Note: In production, static frontend files need to be served (e.g., via nginx or FastAPI static files)

## Key Files
- `frontend/craco.config.js` — CRACO/webpack config (dev server: 0.0.0.0:5000, allowedHosts: all)
- `frontend/src/App.js` — Main React app entry
- `backend/server.py` — FastAPI server (all routes in one file)
- `backend/requirements.txt` — Python dependencies
- `frontend/package.json` — Node dependencies (yarn)
