# Schedora PRD

## Architecture
Frontend: React + Tailwind + Shadcn/UI | Backend: FastAPI + Motor + APScheduler | DB: MongoDB | AI: Gemini 3 Flash | Storage: Emergent Object Storage | Email: Resend | Auth: JWT + Google OAuth

## Implemented (Phases 1-4)
- Email/password + Google OAuth auth with brute force protection
- 5-step onboarding flow
- Post creation with AI content generation (Gemini 3 Flash)
- Recurring scheduling (daily/weekly/monthly)
- Drag-and-drop calendar with status colors
- Post preview for all 5 platforms (Instagram, Facebook, Twitter, LinkedIn, YouTube)
- Auto-retry for failed posts (3 retries, exponential backoff)
- Real OAuth structure for all 5 platforms (keys configured)
- In-app notifications with bell icon
- Admin panel (team invites, post review workflow)
- CSV bulk upload with template download
- Audit logging
- Email notifications (Resend - failed alerts + weekly digest)
- Mobile-responsive sidebar with hamburger menu
- User settings (auto_retry, email preferences)
- OAuth setup guides in /app/docs/

## Backlog
P0: Get platform OAuth apps approved for production use
P1: Dark mode, content pipeline (long -> multi-post)
P2: Smart queue, advanced analytics charts
