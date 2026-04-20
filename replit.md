# Schedora - Social Media Management Platform

## Overview
Schedora is a social media management and automation platform. Users can create, schedule, and automate posts across Instagram, Facebook, Twitter, LinkedIn, and YouTube. Key features include AI-driven content generation (Gemini), a drag-and-drop calendar, bulk CSV uploading, an admin panel for team collaboration, a token-based credit system, subscription tiers with Razorpay payment integration, a Job Posts module, and a Token Dashboard.

## Architecture

### Frontend (React + CRACO)
- **Framework**: React 19 with Create React App (via CRACO override)
- **Styling**: Tailwind CSS + Shadcn/UI components (neubrutalism design system)
- **Routing**: React Router DOM v7
- **Location**: `frontend/`
- **Port**: 5000 (dev server on 0.0.0.0)
- **Entry**: `frontend/src/App.js`
- **Start**: `cd frontend && yarn start`

### Backend (FastAPI + Python)
- **Framework**: FastAPI with uvicorn
- **Database**: MongoDB (via Motor async driver) — external Atlas cluster
- **AI**: Google Gemini (`google-generativeai`)
- **Scheduling**: APScheduler (supports daily/weekly/monthly + custom every_N_minutes/hours/days)
- **Auth**: JWT + Google OAuth
- **Location**: `backend/`
- **Port**: 8000 (localhost)
- **Entry**: `backend/server.py`
- **Start**: `cd backend && uvicorn server:app --host localhost --port 8000 --reload`

## Token Economy (5x Profit Model)

| Action | Cost |
|--------|------|
| AI Caption | 1 🪙 |
| Standard Post | 3 🪙 |
| Link Post (URL detected) | 20 🪙 |
| Job Generation | 15 🪙 |
| Job Export | 10 🪙 |
| Lead Outreach | 10 🪙 |

### Token Packs (Buy Credits via Razorpay)
- Starter: 200 credits → ₹199
- Pro: 500 credits → ₹399
- Power: 1000 credits → ₹699

### Token API Endpoints
- `GET /api/tokens/packs` — list available packs
- `GET /api/tokens/history` — user's token activity log
- `GET /api/tokens/stats` — balance, breakdown, smart insights
- `POST /api/tokens/buy` — create Razorpay order for token pack
- `POST /api/tokens/verify-purchase` — verify + credit tokens after payment

## Pages & Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Landing | Marketing page |
| `/login` | Login | Auth |
| `/dashboard` | Dashboard | Overview |
| `/posts/new` | PostCreator | Create/schedule posts |
| `/posts/schedule` | CalendarView | Visual calendar |
| `/posts/bulk-upload` | BulkUpload | CSV batch posting |
| `/analytics` | Analytics | Performance data |
| `/settings/accounts` | ConnectedAccounts | Social account management |
| `/tokens` | TokenDashboard | Credits balance, history, buy tokens |
| `/pricing` | PricingPage | Subscription plans + Razorpay |
| `/jobs` | JobPosts | Job-specific posts (Pro/Business) |
| `/admin` | AdminDashboard | Admin panel (admin/owner role) |

## Admin Panel Features
- **Overview**: Users, posts, active users (7d), connected accounts, platform breakdown, token usage
- **Revenue & Costs**: Revenue from plans + token purchases, API recharge links (Twitter/Gemini/Razorpay/LinkedIn)
- **User Behavior**: High token users, most active, drop-off risk, full user table
- **Feedback**: Avg rating, top tags, recent feedback cards

## Sidebar Features
- 🪙 Token balance badge with hover tooltip (shows posts remaining estimate)
- Navigation: Dashboard, Calendar, Bulk Upload, Analytics, Job Posts, Accounts, Credits, Pricing, Admin (role-gated)

## Repeat Post (Custom Intervals)
PostCreator supports: One-time, Daily, Weekly, Monthly, and **Custom** (every N minutes/hours/days).
Custom intervals are stored as `every_N_unit` and handled by APScheduler's `IntervalTrigger`.

## Environment Variables
- `REACT_APP_BACKEND_URL` — Backend API URL (default: `http://localhost:8000`)
- `PORT` — Frontend port (5000)
- `MONGO_URL` — MongoDB connection string (has default in server.py)
- `DB_NAME` — MongoDB database name (default: `schedoradb`)
- `GEMINI_API_KEY` — Google Gemini API key
- `JWT_SECRET` — JWT signing secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` — Email config
- `RESEND_API_KEY` — Resend email API key
- `RAZORPAY_KEY_ID` — Razorpay public key (plan upgrades + token purchases)
- `RAZORPAY_KEY_SECRET` — Razorpay secret key

## Subscription Tiers
- **Free**: 1 account, 10 posts/month, no AI, no job posts
- **Pro** (₹999/mo): 5 accounts, 100 posts/month, AI, job posts (no export)
- **Business** (₹2,999/mo): 15 accounts, unlimited posts, AI, job posts + export, priority support

## Workflows
- **Start application** — Frontend dev server on port 5000 (webview)
- **Backend API** — FastAPI backend on port 8000 (console)

## Deployment
- **Target**: Autoscale
- **Build**: `cd frontend && yarn build`
- **Run**: `cd backend && uvicorn server:app --host 0.0.0.0 --port 8000`

## Key Files
- `frontend/craco.config.js` — CRACO/webpack config (dev server: 0.0.0.0:5000, allowedHosts: all)
- `frontend/src/App.js` — Main React app entry + routes
- `frontend/src/components/Sidebar.jsx` — Nav with token badge
- `frontend/src/pages/TokenDashboard.jsx` — Credits management page
- `frontend/src/pages/AdminDashboard.jsx` — Admin panel (4 tabs)
- `frontend/src/pages/PostCreator.jsx` — Post creator with custom repeat intervals
- `backend/server.py` — FastAPI server (all routes in one file)
- `backend/requirements.txt` — Python dependencies
- `frontend/package.json` — Node dependencies (yarn)

## Safety & Limits
- Rate limiting: 20 posts/min per user, 5 job creations/min per user (in-memory)
- Auto-retry failed posts: up to 3 times with 15-minute increments
- Job creation: deducts 15 tokens before processing
- Job export: deducts 10 tokens before returning content

## Replit Migration Notes
- Both workflows start automatically via the "Project" parallel workflow
- Frontend packages in `frontend/node_modules` (yarn)
- Backend packages installed system-wide via pip
- `core-js-pure` was replaced from root `node_modules` to fix incomplete install in `frontend/node_modules`
- Lucide-react source map warnings are harmless — no .map files shipped with that package version
