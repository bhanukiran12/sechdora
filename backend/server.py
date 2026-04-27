from fastapi import FastAPI, APIRouter, HTTPException, Header, File, UploadFile, Response, Query, Depends, Request, Body
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import aiosmtplib
from email.message import EmailMessage
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any, Literal
import uuid
from datetime import datetime, timezone, timedelta
import requests
import google.generativeai as genai
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.cron import CronTrigger
import bcrypt
import jwt
import secrets
import hashlib
import base64
from fastapi.responses import RedirectResponse
import csv
import io
import resend
import razorpay
from bson import ObjectId
from urllib.parse import urlparse, unquote
from queue_manager import enqueue_publish, enqueue_retry
from platform_adapters import ADAPTERS


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ.get('MONGO_URL', 'mongodb+srv://bhanukiran750_db_user:MnjUlSAdWf4kkD6N@cluster0.ubci2qz.mongodb.net/')
# Add TLS parameters to help with SSL Handshake errors in cloud environments
if "tlsAllowInvalidCertificates" not in mongo_url:
    separator = "&" if "?" in mongo_url else "?"
    mongo_url += f"{separator}tls=true&tlsAllowInvalidCertificates=true"

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'schedoradb')]

# Storage
fs = AsyncIOMotorGridFSBucket(db)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
APP_NAME = "schedora"
LINKEDIN_API_VERSION = os.environ.get("LINKEDIN_API_VERSION", "202603")
_realtime_subscribers: Dict[str, List[asyncio.Queue]] = {}


async def ping_database() -> bool:
    try:
        await client.admin.command("ping")
        return True
    except Exception as exc:
        logger.error(f"MongoDB ping failed: {exc}", exc_info=True)
        return False


async def publish_realtime_event(user_id: Any, event_type: str, payload: Optional[Dict[str, Any]] = None) -> None:
    uid = str(user_id)
    subscribers = _realtime_subscribers.get(uid, [])
    if not subscribers:
        return
    event = {
        "type": event_type,
        "payload": payload or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    dead = []
    for queue in subscribers:
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            dead.append(queue)
    if dead:
        _realtime_subscribers[uid] = [queue for queue in subscribers if queue not in dead]


def _derive_public_backend_url():
    # Explicit override wins
    if os.environ.get("BACKEND_URL"):
        return os.environ["BACKEND_URL"].rstrip("/")
    # In single-service deploys, the public frontend domain is often the same host
    if os.environ.get("FRONTEND_URL"):
        return os.environ["FRONTEND_URL"].rstrip("/")
    if os.environ.get("REACT_APP_BACKEND_URL"):
        return os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
    # In Replit dev, build from REPLIT_DEV_DOMAIN or REPLIT_DOMAINS
    replit_dev = os.environ.get("REPLIT_DEV_DOMAIN") or os.environ.get("REPLIT_DOMAINS", "").split(",")[0].strip()
    if replit_dev:
        return f"https://{replit_dev}"
    # Fallback for production / old deploys
    return "https://schedora.in"

PUBLIC_BACKEND_URL = _derive_public_backend_url()

# Scheduler
scheduler = AsyncIOScheduler()

# JWT
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "schedora-fallback-secret-key-for-stability")

# Razorpay
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

# ─── Token Economy (5x Profit Model) ────────────────────────────────────
URL_REGEX = r"(https?://[^\s]+)|(www\.[^\s]+)"
SHORT_LINK_DOMAINS = ['bit.ly', 't.co', 'goo.gl', 'tinyurl.com', 'ow.ly', 'is.gd', 'buff.ly']

TOKEN_COSTS = {
    "ai_caption": 1,
    "standard_post": 2,
    "url_post": 10,
    "lead_outreach": 10,
}

TOKEN_PACKS = {
    "pack_200": {"tokens": 200, "price": 199, "label": "Starter"},
    "pack_500": {"tokens": 500, "price": 399, "label": "Pro"},
    "pack_1000": {"tokens": 1000, "price": 699, "label": "Power"},
}

_rate_limit_store: dict = {}

def check_rate_limit(user_id: str, action: str, max_per_minute: int = 10) -> bool:
    import time
    key = f"{user_id}:{action}"
    now = time.time()
    hits = _rate_limit_store.get(key, [])
    hits = [t for t in hits if now - t < 60]
    if len(hits) >= max_per_minute:
        return False
    hits.append(now)
    _rate_limit_store[key] = hits
    return True

def detect_url(content):
    """Detect URLs in content."""
    if not content:
        return {"isUrlPost": False, "urls": []}
    
    import re
    urls = []
    
    http_matches = re.findall(r"https?://[^\s]+", content, re.IGNORECASE)
    if http_matches:
        urls.extend(http_matches)
    
    www_matches = re.findall(r"www\.[^\s]+", content)
    if www_matches:
        urls.extend(www_matches)
    
    for domain in SHORT_LINK_DOMAINS:
        short_pattern = f"{domain}/[a-zA-Z0-9]+"
        short_matches = re.findall(short_pattern, content)
        if short_matches:
            urls.extend(short_matches)
    
    return {
        "isUrlPost": len(urls) > 0,
        "urls": list(set(urls))
    }

def calculate_token_cost(content):
    """Calculate token cost for content."""
    detection = detect_url(content)
    cost_type = "url" if detection["isUrlPost"] else "standard"
    tokens_required = TOKEN_COSTS["url_post"] if detection["isUrlPost"] else TOKEN_COSTS["standard_post"]
    
    return {
        "tokensRequired": tokens_required,
        "type": cost_type,
        "urls": detection["urls"]
    }

ADMIN_ROLES = {"admin", "owner"}

async def deduct_tokens(user, tokens):
    """Deduct tokens from user balance. Returns (success, message).
    Admin/owner accounts have unlimited credits and never get deducted — they
    must be able to test every feature without being blocked."""
    if not user:
        return False, "User not found"

    if user.get("role") in ADMIN_ROLES:
        return True, "Admin bypass — unlimited credits"

    current_balance = user.get("tokens", 0)
    if current_balance < tokens:
        return False, f"Not enough credits. Need {tokens} credits, you have {current_balance}."

    await db.users.update_one(
        {"_id": to_object_id(user["_id"])},
        {"$inc": {"tokens": -tokens}}
    )
    return True, "Tokens deducted"

async def log_token_usage(user, action, token_type, tokens):
    """Log token usage for analytics."""
    await db.token_logs.insert_one({
        "user_id": str(user["_id"]),
        "action": action,
        "type": token_type,
        "tokens": tokens,
        "createdAt": datetime.now(timezone.utc)
    })

# ─── Pricing Plans ───────────────────────────────────────────────────────────
PLANS = {
    "free": {
        "name": "Free", "price": 0,
        "maxAccounts": 1, "maxPostsPerMonth": 10, "maxPlatforms": 1,
        "aiEnabled": False,
        "prioritySupport": False, "bulkUpload": False,
        "analyticsDetailed": False, "customRecurrence": False,
    },
    "pro": {
        "name": "Pro", "price": 999,
        "maxAccounts": 5, "maxPostsPerMonth": 100, "maxPlatforms": 3,
        "aiEnabled": True,
        "prioritySupport": False, "bulkUpload": True,
        "analyticsDetailed": True, "customRecurrence": True,
    },
    "business": {
        "name": "Business", "price": 2999,
        "maxAccounts": 15, "maxPostsPerMonth": None, "maxPlatforms": 10,
        "aiEnabled": True,
        "prioritySupport": True, "bulkUpload": True,
        "analyticsDetailed": True, "customRecurrence": True,
    },
}

ADMIN_PLAN = {
    "name": "Admin", "price": 0,
    "maxAccounts": 9999, "maxPostsPerMonth": None, "maxPlatforms": 9999,
    "aiEnabled": True,
    "prioritySupport": True, "bulkUpload": True,
    "analyticsDetailed": True, "customRecurrence": True,
}

# SMTP Config (Netlify/GoDaddy/ForwardEmail)
SMTP_HOST = os.environ.get("SMTP_HOST", "smtpout.secureserver.net")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "support@schedora.in")
SMTP_PASS = os.environ.get("SMTP_PASSWORD") or os.environ.get("SMTP_PASS")  # User must set this in Render
SENDER_EMAIL = SMTP_USER

class AnalyticsEvent(BaseModel):
    event: str
    properties: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class UserFeedback(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    userId: Optional[str] = None
    message: Optional[str] = ""
    tags: List[str] = Field(default_factory=list)
    createdAt: Optional[str] = None

app = FastAPI()

# Move CORS to the top to ensure headers are added even on early crashes
origins = [
    os.environ.get('FRONTEND_URL', 'http://localhost:5000').rstrip("/"),
    "https://schedora.in",
    "https://www.schedora.in",
    "https://sechdora.onrender.com",
    "http://localhost:3000",
    "http://localhost:5000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.replit\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )

api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ========== HELPERS ==========
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        if not hashed or not plain:
            return False
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def to_object_id(value: Any) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(str(value))


def user_id_variants(value: Any) -> List[Any]:
    variants = [str(value)]
    try:
        variants.append(to_object_id(value))
    except Exception:
        pass
    return variants


def bson_safe(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [bson_safe(item) for item in value]
    if isinstance(value, dict):
        return {key: bson_safe(item) for key, item in value.items()}
    return value

def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode({"sub": str(user_id), "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    return jwt.encode({"sub": str(user_id), "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def extract_bearer_token(request: Request, auth: Optional[str] = None) -> Optional[str]:
    token = request.cookies.get("access_token")
    if token:
        return token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    if auth:
        return auth
    return None


async def get_current_user_from_token(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        if "role" not in user:
            user["role"] = "user"
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request) -> dict:
    token = extract_bearer_token(request)
    return await get_current_user_from_token(token)

async def put_object(path: str, data: bytes, content_type: str) -> dict:
    grid_in = fs.open_upload_stream(path, metadata={"contentType": content_type})
    await grid_in.write(data)
    await grid_in.close()
    return {"path": path, "size": len(data)}

async def get_object(path: str):
    cursor = fs.find({"filename": path})
    docs = await cursor.to_list(1)
    if not docs:
        raise HTTPException(status_code=404, detail="File not found in storage")
    grid_out = await fs.open_download_stream(docs[0]["_id"])
    data = await grid_out.read()
    content_type = docs[0].get("metadata", {}).get("contentType", "application/octet-stream") if docs[0].get("metadata") else "application/octet-stream"
    return data, content_type


def normalize_media_url(url: str) -> str:
    if not url:
        return ""
    url = str(url).strip()
    if not url:
        return ""
    if url.startswith("http://") or url.startswith("https://"):
        parsed = urlparse(url)
        public_host = urlparse(PUBLIC_BACKEND_URL).netloc
        known_internal_hosts = {
            public_host,
            "schedora.in",
            "www.schedora.in",
            "sechdora-1.onrender.com",
            "sechdora.onrender.com",
        }
        if parsed.path.startswith("/api/files/") and parsed.netloc in known_internal_hosts:
            return f"{PUBLIC_BACKEND_URL}{parsed.path}"
        return url
    if url.startswith("/api/files/"):
        return f"{PUBLIC_BACKEND_URL}{url}"
    if url.startswith("api/files/"):
        return f"{PUBLIC_BACKEND_URL}/{url}"
    if url.startswith("/"):
        return f"{PUBLIC_BACKEND_URL}{url}"
    return f"{PUBLIC_BACKEND_URL}/{url}"


def normalize_media_urls(values: Any) -> List[str]:
    if not values:
        return []
    if isinstance(values, str):
        values = [values]
    normalized = []
    for value in values:
        url = normalize_media_url(value)
        if url:
            normalized.append(url)
    return normalized[:10]


def linkedin_headers(token: str, include_content_type: bool = True, include_version: bool = True) -> Dict[str, str]:
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    if include_version:
        headers["Linkedin-Version"] = LINKEDIN_API_VERSION
    if include_content_type:
        headers["Content-Type"] = "application/json"
    return headers


def normalize_linkedin_share_urn(platform_post_id: str) -> str:
    if not platform_post_id:
        return ""
    value = unquote(str(platform_post_id))
    if value.startswith("urn:li:"):
        return value
    if value.startswith("share:") or value.startswith("ugcPost:"):
        return f"urn:li:{value}"
    if value.isdigit():
        return f"urn:li:share:{value}"
    return value


async def fetch_x_post_metrics(account: dict, platform_post_id: str) -> Dict[str, int]:
    token = account.get("access_token")
    if not token or not platform_post_id:
        return {}
    resp = requests.get(
        f"https://api.x.com/2/tweets/{platform_post_id}",
        params={"tweet.fields": "public_metrics,organic_metrics"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    if resp.status_code == 401:
        new_token = await refresh_social_token("twitter", account)
        if new_token:
            resp = requests.get(
                f"https://api.x.com/2/tweets/{platform_post_id}",
                params={"tweet.fields": "public_metrics,organic_metrics"},
                headers={"Authorization": f"Bearer {new_token}"},
                timeout=20,
            )
    if resp.status_code != 200:
        raise RuntimeError(f"X metrics fetch failed: {resp.status_code} {resp.text}")

    tweet = resp.json().get("data", {})
    public_metrics = tweet.get("public_metrics", {})
    organic_metrics = tweet.get("organic_metrics", {})
    likes = int(public_metrics.get("like_count", 0) or 0)
    comments = int(public_metrics.get("reply_count", 0) or 0)
    shares = int(public_metrics.get("retweet_count", 0) or 0) + int(public_metrics.get("quote_count", 0) or 0)
    impressions = int(organic_metrics.get("impression_count", 0) or 0)
    total_engagement = likes + comments + shares
    engagement_rate = round((total_engagement / impressions) * 100, 2) if impressions else 0
    return {
        "impressions": impressions,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "engagement_rate": engagement_rate,
    }


async def fetch_linkedin_post_metrics(account: dict, platform_post_id: str) -> Dict[str, int]:
    token = account.get("access_token")
    share_urn = normalize_linkedin_share_urn(platform_post_id)
    if not token or not share_urn:
        return {}
    encoded_urn = requests.utils.quote(share_urn, safe="")
    resp = requests.get(
        f"https://api.linkedin.com/rest/socialMetadata/{encoded_urn}",
        headers=linkedin_headers(token, include_content_type=False),
        timeout=20,
    )
    if resp.status_code == 401:
        new_token = await refresh_social_token("linkedin", account)
        if new_token:
            resp = requests.get(
                f"https://api.linkedin.com/rest/socialMetadata/{encoded_urn}",
                headers=linkedin_headers(new_token, include_content_type=False),
                timeout=20,
            )
    if resp.status_code != 200:
        raise RuntimeError(f"LinkedIn metrics fetch failed: {resp.status_code} {resp.text}")

    data = resp.json()
    reactions = sum(int(summary.get("count", 0) or 0) for summary in (data.get("reactionSummaries") or {}).values())
    comments = int((data.get("commentSummary") or {}).get("count", 0) or 0)
    shares = int((data.get("shareSummary") or {}).get("shareCount", 0) or 0)
    return {
        "impressions": 0,
        "likes": reactions,
        "comments": comments,
        "shares": shares,
        "engagement_rate": 0,
    }


async def fetch_live_post_metrics(platform: str, account: dict, platform_post_id: str) -> Dict[str, int]:
    if platform == "twitter":
        return await fetch_x_post_metrics(account, platform_post_id)
    if platform == "linkedin":
        return await fetch_linkedin_post_metrics(account, platform_post_id)
    return {}


async def sync_live_metrics_for_user(user_id: Any) -> bool:
    account_map = {
        account["account_id"]: account
        for account in await db.social_accounts.find({"user_id": {"$in": user_id_variants(user_id)}}, {"_id": 0}).to_list(100)
    }
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    analytics_rows = await db.analytics.find({
        "user_id": str(user_id),
        "platform": {"$in": ["twitter", "linkedin"]},
        "platform_post_id": {"$exists": True, "$ne": None},
        "$or": [
            {"metrics_synced_at": {"$exists": False}},
            {"metrics_synced_at": {"$lt": cutoff.isoformat()}}
        ]
    }).sort("created_at", -1).limit(20).to_list(20)

    changed = False
    for row in analytics_rows:
        account = account_map.get(row.get("account_id"))
        if not account:
            continue
        try:
            metrics = await fetch_live_post_metrics(row.get("platform"), account, row.get("platform_post_id"))
            if not metrics:
                continue
            await db.analytics.update_one(
                {"post_id": row.get("post_id"), "platform": row.get("platform"), "account_id": row.get("account_id")},
                {"$set": {
                    **metrics,
                    "metrics_source": "platform_api",
                    "metrics_synced_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            changed = True
        except Exception as exc:
            logger.error(f"Metrics sync failed for {row.get('platform')}:{row.get('platform_post_id')}: {exc}")
            await db.analytics.update_one(
                {"post_id": row.get("post_id"), "platform": row.get("platform"), "account_id": row.get("account_id")},
                {"$set": {"metrics_sync_error": str(exc), "metrics_synced_at": datetime.now(timezone.utc).isoformat()}}
            )
    if changed:
        await publish_realtime_event(user_id, "analytics.updated", {"source": "metrics_sync"})
    return changed


async def fetch_media_binary(media_url: str) -> tuple[bytes, str, str]:
    parsed = urlparse(media_url)
    path = parsed.path or ""

    if "/api/files/" in path:
        storage_path = unquote(path.split("/api/files/", 1)[1])
        data, content_type = await get_object(storage_path)
        filename = storage_path.rsplit("/", 1)[-1] or "upload"
        return data, content_type, filename

    resp = requests.get(media_url, timeout=20)
    resp.raise_for_status()
    filename = path.rsplit("/", 1)[-1] or "upload"
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream"), filename


async def linkedin_upload_image(token: str, owner_urn: str, media_url: str) -> str:
    data, content_type, filename = await fetch_media_binary(media_url)
    if not content_type.startswith("image/"):
        raise ValueError(f"LinkedIn only supports image uploads here. Got {content_type} for {filename}.")

    init_resp = requests.post(
        "https://api.linkedin.com/rest/images?action=initializeUpload",
        json={"initializeUploadRequest": {"owner": owner_urn}},
        headers=linkedin_headers(token),
        timeout=20,
    )
    if init_resp.status_code != 200:
        raise RuntimeError(f"LinkedIn image initialize failed: {init_resp.status_code} {init_resp.text}")

    init_data = init_resp.json().get("value", {})
    upload_url = init_data.get("uploadUrl")
    image_urn = init_data.get("image")
    if not upload_url or not image_urn:
        raise RuntimeError(f"LinkedIn image initialize returned unexpected payload: {init_resp.text}")

    upload_resp = requests.put(
        upload_url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": content_type,
        },
        timeout=60,
    )
    if upload_resp.status_code not in (200, 201, 202):
        raise RuntimeError(f"LinkedIn image upload failed: {upload_resp.status_code} {upload_resp.text}")

    for _ in range(10):
        status_resp = requests.get(
            f"https://api.linkedin.com/rest/images/{requests.utils.quote(image_urn, safe='')}",
            headers=linkedin_headers(token, include_content_type=False),
            timeout=15,
        )
        if status_resp.status_code == 200:
            status = status_resp.json().get("status")
            if status == "AVAILABLE":
                return image_urn
            if status == "PROCESSING_FAILED":
                raise RuntimeError(f"LinkedIn image processing failed for {filename}.")
        elif status_resp.status_code == 403:
            # Some member-only tokens cannot read versioned rest/images even after upload.
            await asyncio.sleep(2)
            return image_urn
        await asyncio.sleep(2)

    return image_urn


# ─── Plan Helpers ─────────────────────────────────────────────────────────────

def get_plan(user: dict) -> dict:
    if user.get("role") in ADMIN_ROLES:
        return ADMIN_PLAN
    return PLANS.get(user.get("planType", "free"), PLANS["free"])

async def enforce_account_limit(user: dict):
    if user.get("role") in ADMIN_ROLES:
        return
    plan = get_plan(user)
    connected = await db.social_accounts.count_documents({"user_id": user["_id"], "status": "connected"})
    if connected >= plan["maxAccounts"]:
        raise HTTPException(status_code=403, detail={
            "code": "account_limit_reached",
            "message": f"Account limit reached ({connected}/{plan['maxAccounts']}). Upgrade your plan to connect more accounts.",
            "upgrade": True,
        })

async def enforce_post_limit(user: dict):
    if user.get("role") in ADMIN_ROLES:
        return
    plan = get_plan(user)
    if plan["maxPostsPerMonth"] is None:
        return
    posts_used = user.get("postsUsedThisMonth", 0)
    if posts_used >= plan["maxPostsPerMonth"]:
        raise HTTPException(status_code=403, detail={
            "code": "post_limit_reached",
            "message": f"You've reached your monthly post limit ({posts_used}/{plan['maxPostsPerMonth']}). Upgrade to unlock unlimited posting.",
            "upgrade": True,
        })

def enforce_feature(user: dict, feature: str):
    if user.get("role") in ADMIN_ROLES:
        return
    plan = get_plan(user)
    if not plan.get(feature, False):
        feature_names = {
            "aiEnabled": "AI content generation",
            "prioritySupport": "Priority support",
            "bulkUpload": "Bulk CSV upload",
            "analyticsDetailed": "Detailed analytics",
            "customRecurrence": "Custom repeat intervals",
        }
        plan_needed = "Pro or Business"
        raise HTTPException(status_code=403, detail={
            "code": "feature_locked",
            "message": f"Upgrade to {plan_needed} to access {feature_names.get(feature, feature)}.",
            "upgrade": True,
        })


def build_email_brand_header() -> str:
    return """
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="middle" style="padding-right:14px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="52" height="52" style="width:52px;height:52px;border-collapse:separate;">
                  <tr>
                    <td align="center" valign="middle" style="background:linear-gradient(135deg,#7d63ff 0%,#ff4fd8 55%,#ff8a3d 100%);border:2px solid #111111;border-radius:16px;box-shadow:4px 4px 0 #111111;position:relative;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                        <tr>
                          <td align="center" valign="middle" style="padding:0 8px;">
                            <div style="width:26px;height:18px;border-radius:999px;background:#ffffff;border:2px solid #111111;position:relative;margin:0 auto 4px auto;">
                              <span style="position:absolute;left:5px;top:5px;width:4px;height:4px;border-radius:999px;background:#111111;display:block;"></span>
                              <span style="position:absolute;right:5px;top:5px;width:4px;height:4px;border-radius:999px;background:#111111;display:block;"></span>
                            </div>
                            <div style="width:18px;height:10px;border-radius:0 0 10px 10px;border:2px solid #111111;border-top:none;background:#35d6c7;margin:0 auto;"></div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
              <td valign="middle">
                <div style="font-family:Arial,sans-serif;font-size:28px;line-height:1;font-weight:900;letter-spacing:-0.04em;color:#111111;">Schedora</div>
                <div style="margin-top:6px;font-family:Arial,sans-serif;font-size:11px;line-height:1.2;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#666666;">AI scheduling platform</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    """


def build_email_shell(title: str, intro: str, body_html: str, cta_label: Optional[str] = None, cta_href: Optional[str] = None) -> str:
    cta_html = ""
    if cta_label and cta_href:
        cta_html = f"""
        <div style="margin-top:28px;">
          <a href="{cta_href}" style="display:inline-block;background:#FF4500;color:#ffffff;padding:14px 22px;text-decoration:none;border-radius:14px;border:2px solid #111111;box-shadow:4px 4px 0 #111111;font-family:Arial,sans-serif;font-weight:900;letter-spacing:0.04em;text-transform:uppercase;font-size:12px;">
            {cta_label}
          </a>
        </div>
        """
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fffdf8;border:2px solid #111111;border-radius:22px;box-shadow:4px 4px 0 #111111;padding:28px;">
      {build_email_brand_header()}
      <div style="padding-top:6px;">
        <h2 style="margin:0 0 10px 0;font-size:28px;line-height:1.05;font-weight:900;letter-spacing:-0.04em;color:#111111;">{title}</h2>
        <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#444444;">{intro}</p>
        {body_html}
        {cta_html}
      </div>
    </div>
    """
# ========== EMAIL HELPER ==========
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

async def send_email(to: str, subject: str, html: str):
    """Send email via Resend API (preferred) or SMTP fallback."""
    # Try Resend first if API key is available
    if RESEND_API_KEY:
        try:
            resend.api_key = RESEND_API_KEY
            params = {
                "from": f"Schedora <onboarding@resend.dev>",
                "to": [to],
                "subject": subject,
                "html": html,
            }
            resend.Emails.send(params)
            logger.info(f"Email sent via Resend to {to}")
            return True
        except Exception as e:
            logger.error(f"Resend send failed to {to}: {e}")
            # Fall through to SMTP

    # Try SMTP if configured
    if SMTP_PASS:
        try:
            message = EmailMessage()
            message["From"] = f"Schedora <{SENDER_EMAIL}>"
            message["To"] = to
            message["Subject"] = subject
            message["Reply-To"] = SENDER_EMAIL
            message["X-Auto-Response-Suppress"] = "All"
            message["Precedence"] = "bulk"
            message["X-Priority"] = "1"
            message["Importance"] = "high"
            message.set_content("Your email client does not support HTML emails.")
            message.add_alternative(html, subtype="html")
            await aiosmtplib.send(
                message,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USER,
                password=SMTP_PASS,
                use_tls=(SMTP_PORT == 465),
                start_tls=(SMTP_PORT == 587)
            )
            logger.info(f"Email sent via SMTP to {to}")
            return True
        except Exception as e:
            logger.error(f"SMTP send failed to {to}: {e}")

    logger.error(f"No email service configured (set RESEND_API_KEY or SMTP_PASSWORD)")
    return False

async def send_otp_email(to: str, otp: str):
    subject = "Your Schedora verification code"
    html = build_email_shell(
        title="Your verification code",
        intro="Enter this code to finish creating your Schedora account.",
        body_html=f"""
        <div style="background:#ffd21f;border:2px solid #111111;border-radius:18px;padding:18px;text-align:center;box-shadow:4px 4px 0 #111111;">
          <div style="font-size:12px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:#111111;margin-bottom:10px;">One-time code</div>
          <div style="font-size:38px;line-height:1;font-weight:900;letter-spacing:0.28em;color:#111111;">{otp}</div>
        </div>
        <p style="margin:18px 0 0 0;font-size:13px;line-height:1.6;color:#555555;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
        """
    )
    return await send_email(to, subject, html)


# ========== NOTIFICATION & AUDIT ==========
async def create_notification(user_id: str, ntype: str, title: str, message: str, post_id: str = None):
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id, "type": ntype, "title": title,
        "message": message, "post_id": post_id, "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    await publish_realtime_event(user_id, "notifications.updated", {
        "notification_id": notification["notification_id"],
        "post_id": post_id,
        "title": title,
    })

async def log_audit(user_id: str, action: str, resource_type: str, resource_id: str, details: dict = None):
    await db.audit_logs.insert_one({
        "user_id": user_id, "action": action, "resource_type": resource_type,
        "resource_id": resource_id, "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


# ========== MODELS ==========
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserVerifyOTP(BaseModel):
    email: EmailStr
    otp: str


class ResendOtpRequest(BaseModel):
    email: EmailStr

class SessionExchangeRequest(BaseModel):
    session_id: str

class SessionResponse(BaseModel):
    access_token: str
    user: dict

class SocialAccountConnect(BaseModel):
    platform: str
    access_token: str
    refresh_token: Optional[str] = None
    platform_user_id: Optional[str] = None
    username: Optional[str] = None

class PostCreate(BaseModel):
    content: str
    platforms: List[str]
    platform_captions: Optional[Dict[str, str]] = None
    target_accounts: Optional[Dict[str, List[str]]] = None
    scheduled_time: Optional[str] = None
    media_urls: Optional[List[str]] = []
    status: Optional[str] = "draft"
    recurrence: Optional[str] = None  # none, daily, weekly, monthly
    auto_retry: Optional[bool] = False
    type: Literal["text", "image", "video", "link"]

class TeamInvite(BaseModel):
    email: EmailStr
    role: str = "editor"

class PostBulk(BaseModel):
    posts: List[Dict[str, Any]]


def sanitize_target_accounts(target_accounts: Optional[Dict[str, Any]]) -> Dict[str, List[str]]:
    if not target_accounts or not isinstance(target_accounts, dict):
        return {}

    sanitized: Dict[str, List[str]] = {}
    for platform, values in target_accounts.items():
        if not platform:
            continue
        if isinstance(values, list):
            cleaned = [str(v) for v in values if str(v).strip()]
        elif values:
            cleaned = [str(values)]
        else:
            cleaned = []
        if cleaned:
            sanitized[str(platform)] = cleaned
    return sanitized


def estimate_publish_metrics(content: str, platform: str, account_count: int = 1) -> Dict[str, Any]:
    content_length = len(content or "")
    base_impressions = max(40, content_length * 3)
    platform_multiplier = {
        "linkedin": 1.4,
        "twitter": 1.1,
        "facebook": 1.2,
        "instagram": 1.3,
        "youtube": 1.5,
    }.get(platform, 1.0)
    impressions = int(base_impressions * platform_multiplier * max(account_count, 1))
    likes = max(1, impressions // 18)
    comments = max(0, impressions // 75)
    shares = max(0, impressions // 50)
    total_engagement = likes + comments + shares
    engagement_rate = round((total_engagement / impressions) * 100, 2) if impressions else 0
    return {
        "impressions": impressions,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "engagement_rate": engagement_rate,
    }


def select_target_accounts(accounts: List[dict], platform: str, target_accounts: Optional[Dict[str, List[str]]] = None) -> List[dict]:
    platform_accounts = [acc for acc in accounts if acc.get("platform") == platform and acc.get("status") == "connected"]
    selected_ids = (target_accounts or {}).get(platform) or []
    if selected_ids:
        chosen = [acc for acc in platform_accounts if acc.get("account_id") in selected_ids]
        return chosen
    return platform_accounts[:1]


def parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None

class AIContentRequest(BaseModel):
    topic: str
    platforms: List[str]

class AIImproveRequest(BaseModel):
    caption: str
    platform: str

class OnboardingData(BaseModel):
    creator_type: str
    preferred_platforms: List[str]

class UserSettings(BaseModel):
    auto_retry_failed: Optional[bool] = None
    email_on_failure: Optional[bool] = None
    email_weekly_digest: Optional[bool] = None


# ========== AUTH ==========
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    email = user_data.email.lower()
    
    # Check if user already exists and is verified
    existing_user = await db.users.find_one({"email": email})
    if existing_user and existing_user.get("status") != "unverified":
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate OTP
    otp = f"{secrets.randbelow(1000000):06d}"
    
    # Store user (or update unverified user)
    user_doc = {
        "email": email, "password_hash": hash_password(user_data.password),
        "name": user_data.name, "role": "user", "status": "unverified",
        "planType": "free", "postsUsedThisMonth": 0,
        "tokens": 10,  # Free tokens for new users
        "subscriptionStatus": "inactive", "planExpiryDate": None,
        "settings": {"auto_retry_failed": True, "email_on_failure": True, "email_weekly_digest": True},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.update_one({"email": email}, {"$set": user_doc}, upsert=True)
    
    # Store OTP in temporal collection
    await db.otp_verifications.update_one(
        {"email": email},
        {"$set": {"otp": otp, "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)}},
        upsert=True
    )
    
    sent, delivery_detail = await issue_otp(email, otp)
    if not sent:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to send verification email. {delivery_detail}"
        )
    
    return {"message": "Verification code sent to email", "email": email, "delivery": delivery_detail}


async def issue_otp(email: str, otp: str) -> tuple[bool, str]:
    sent = await send_otp_email(email, otp)
    if not sent:
        # Dev fallback: log OTP to console so user can complete registration
        if not SMTP_PASS and not RESEND_API_KEY:
            logger.warning(
                f"\n{'='*50}\n"
                f"[DEV] No email service configured.\n"
                f"OTP for {email}: {otp}\n"
                f"Set RESEND_API_KEY or SMTP_PASSWORD to enable email delivery.\n"
                f"{'='*50}"
            )
            return True, "OTP printed to backend console (no email service configured)"
        log_msg = f"Email delivery failed. Check RESEND_API_KEY or SMTP credentials."
        logger.error(f"OTP SEND FAILURE: {log_msg}")
        return False, log_msg
    return True, "Verification email sent"


@api_router.post("/auth/resend-otp")
async def resend_otp(data: ResendOtpRequest):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.get("status") != "unverified":
        raise HTTPException(status_code=400, detail="Account already verified")

    otp = f"{secrets.randbelow(1000000):06d}"
    await db.otp_verifications.update_one(
        {"email": email},
        {"$set": {"otp": otp, "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)}},
        upsert=True
    )

    sent, delivery_detail = await issue_otp(email, otp)
    if not sent:
        raise HTTPException(status_code=500, detail=f"Unable to resend verification email. {delivery_detail}")
    return {"message": "Verification code resent", "email": email, "delivery": delivery_detail}

@api_router.post("/auth/verify-otp", response_model=SessionResponse)
async def verify_otp(data: UserVerifyOTP, response: Response):
    email = data.email.lower()
    verify_doc = await db.otp_verifications.find_one({"email": email})
    
    if not verify_doc or verify_doc["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if verify_doc["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    # Activate user
    result = await db.users.update_one({"email": email}, {"$set": {"status": "verified"}})
    user = await db.users.find_one({"email": email})
    
    # Delete OTP
    await db.otp_verifications.delete_one({"email": email})
    
    # Log in user
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    user["_id"] = user_id
    user.pop("password_hash", None)
    
    await log_event(user_id, "user_activated", {"email": email})
    return SessionResponse(access_token=access_token, user=user)

@api_router.post("/auth/login", response_model=SessionResponse)
async def login(credentials: UserLogin, response: Response, request: Request):
    email = credentials.email.lower()
    try:
        user = await db.users.find_one({"email": email})

        if not user or not user.get("password_hash") or not verify_password(credentials.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if user.get("status") == "unverified":
            raise HTTPException(status_code=403, detail="Email not verified")

        user_id = str(user["_id"])
        access_token = create_access_token(user_id, email)
        refresh_token = create_refresh_token(user_id)
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

        user["_id"] = user_id
        user.pop("password_hash", None)

        await log_event(user_id, "user_login", {"email": email})
        return SessionResponse(access_token=access_token, user=user)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Login failed for {email}: {exc}", exc_info=True)
        raise HTTPException(status_code=503, detail="Database unavailable. Please try again shortly.")

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.get("/auth/google")
async def google_login():
    """Generate Google OAuth URL and redirect."""
    google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    if not google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")
    redirect_uri = f"{PUBLIC_BACKEND_URL}/api/auth/google/callback"
    state = secrets.token_urlsafe(16)
    params = {
        "client_id": google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    }
    await db.oauth_states.insert_one({"state": state, "platform": "google_login", "created_at": datetime.now(timezone.utc).isoformat()})
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    return RedirectResponse(auth_url)

@api_router.get("/auth/google/callback")
async def google_callback(code: str = Query(None), state: str = Query(None), error: str = Query(None), response: Response = None):
    """Handle Google OAuth callback, create/login user, redirect to frontend."""
    frontend_url = os.environ.get("FRONTEND_URL", "")
    if not frontend_url:
        # In Replit, frontend and backend share the same proxied domain
        frontend_url = PUBLIC_BACKEND_URL

    if error:
        return RedirectResponse(f"{frontend_url}/login?error=google_denied")

    if not code:
        return RedirectResponse(f"{frontend_url}/login?error=no_code")

    # Verify state
    if state:
        state_doc = await db.oauth_states.find_one({"state": state, "platform": "google_login"})
        if state_doc:
            await db.oauth_states.delete_one({"state": state})

    google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    google_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    redirect_uri = f"{PUBLIC_BACKEND_URL}/api/auth/google/callback"

    # Exchange code for tokens
    token_resp = requests.post("https://oauth2.googleapis.com/token", data={
        "code": code,
        "client_id": google_client_id,
        "client_secret": google_client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    })
    if not token_resp.ok:
        logger.error(f"Google token exchange failed: {token_resp.text}")
        return RedirectResponse(f"{frontend_url}/login?error=token_exchange")

    token_data = token_resp.json()
    id_token_str = token_data.get("id_token")

    # Get user info from Google
    userinfo_resp = requests.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {token_data['access_token']}"})
    if not userinfo_resp.ok:
        return RedirectResponse(f"{frontend_url}/login?error=userinfo")

    ginfo = userinfo_resp.json()
    email = ginfo.get("email", "").lower()
    name = ginfo.get("name", email.split("@")[0])
    google_sub = ginfo.get("sub")
    picture = ginfo.get("picture", "")

    if not email:
        return RedirectResponse(f"{frontend_url}/login?error=no_email")

    # Upsert user
    existing = await db.users.find_one({"email": email})
    if existing:
        # Link google_sub if not already linked
        if not existing.get("google_sub"):
            await db.users.update_one({"_id": existing["_id"]}, {"$set": {"google_sub": google_sub, "avatar": picture, "status": "active"}})
        user_id = str(existing["_id"])
    else:
        user_doc = {
            "email": email, "name": name, "role": "user", "status": "active",
            "google_sub": google_sub, "avatar": picture,
            "planType": "free", "postsUsedThisMonth": 0,
            "subscriptionStatus": "inactive", "planExpiryDate": None,
            "settings": {"auto_retry_failed": True, "email_on_failure": True, "email_weekly_digest": True},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "onboarding_completed": False,
        }
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

    access_token = create_access_token(user_id, email)
    refresh_tok = create_refresh_token(user_id)

    await log_event(user_id, "user_login_google", {"email": email})

    # Redirect to frontend with token in URL (frontend picks it up and stores in localStorage)
    redirect_response = RedirectResponse(f"{frontend_url}/auth/callback?token={access_token}&refresh={refresh_tok}&provider=google")
    redirect_response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    redirect_response.set_cookie(key="refresh_token", value=refresh_tok, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return redirect_response


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"access_token": access_token}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ========== ANALYTICS & EVENT TRACKING ==========
async def log_event(user_id: str, event_name: str, metadata: Dict[str, Any] = None):
    """Internal helper to log events to the analytics collection."""
    try:
        doc = {
            "user_id": user_id,
            "event": event_name,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.analytics.insert_one(doc)
    except Exception as e:
        logger.error(f"Error logging event {event_name}: {e}")

@api_router.post("/analytics/track")
async def track_frontend_event(data: AnalyticsEvent, user: dict = Depends(get_current_user)):
    """API endpoint for frontend to log user actions."""
    await log_event(user["_id"], data.event, {**(data.properties or {}), **(data.metadata or {})})
    return {"status": "ok"}

@api_router.post("/feedback")
async def submit_feedback(data: UserFeedback, user: dict = Depends(get_current_user)):
    """API endpoint for final users to submit feedback/reviews."""
    payload_user_id = data.userId or user["_id"]
    feedback_doc = {
        "user_id": user["_id"],
        "payload_user_id": payload_user_id,
        "user_email": user["email"],
        "rating": data.rating,
        "message": data.message or "",
        "tags": data.tags or [],
        "created_at": data.createdAt or datetime.now(timezone.utc).isoformat(),
    }
    await db.feedback.insert_one(feedback_doc)
    await log_event(user["_id"], "feedback_submitted", {"rating": data.rating, "tags": data.tags or []})
    return {"message": "Thank you for your feedback!"}


# ========== USER SETTINGS ==========

@api_router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    return user.get("settings", {"auto_retry_failed": True, "email_on_failure": True, "email_weekly_digest": True})

@api_router.put("/settings")
async def update_settings(data: UserSettings, user: dict = Depends(get_current_user)):
    update = {}
    if data.auto_retry_failed is not None:
        update["settings.auto_retry_failed"] = data.auto_retry_failed
    if data.email_on_failure is not None:
        update["settings.email_on_failure"] = data.email_on_failure
    if data.email_weekly_digest is not None:
        update["settings.email_weekly_digest"] = data.email_weekly_digest
    if update:
        await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": update})
    return {"message": "Settings updated"}


# ========== SOCIAL ACCOUNTS (OAuth Structure) ==========
PLATFORM_CONFIGS = {
    "instagram": {"auth_url": "https://www.facebook.com/v20.0/dialog/oauth", "token_url": "https://graph.facebook.com/v20.0/oauth/access_token", "scopes": "instagram_basic,pages_show_list"},
    "facebook": {"auth_url": "https://www.facebook.com/v20.0/dialog/oauth", "token_url": "https://graph.facebook.com/v20.0/oauth/access_token", "scopes": "public_profile,email"},
    "twitter": {"auth_url": "https://twitter.com/i/oauth2/authorize", "token_url": "https://api.twitter.com/2/oauth2/token", "scopes": "tweet.read tweet.write users.read offline.access"},
    "linkedin": {"auth_url": "https://www.linkedin.com/oauth/v2/authorization", "token_url": "https://www.linkedin.com/oauth/v2/accessToken", "scopes": "openid profile email w_member_social"},
    "youtube": {"auth_url": "https://accounts.google.com/o/oauth2/auth", "token_url": "https://oauth2.googleapis.com/token", "scopes": "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl"}
}

@api_router.get("/social-accounts/oauth-url/{platform}")
async def get_oauth_url(platform: str, user: dict = Depends(get_current_user)):
    """Get OAuth authorization URL for a platform."""
    config = PLATFORM_CONFIGS.get(platform)
    if not config:
        raise HTTPException(status_code=400, detail="Unsupported platform")
    
    client_id = os.environ.get(f"{platform.upper()}_CLIENT_ID")
    redirect_uri = os.environ.get(f"{platform.upper()}_REDIRECT_URI")
    
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=400, detail=f"OAuth not configured for {platform}. Add {platform.upper()}_CLIENT_ID and {platform.upper()}_REDIRECT_URI to .env")
    
    state = secrets.token_urlsafe(16)
    
    # Store PKCE verifier for Twitter
    code_verifier = secrets.token_urlsafe(32)
    await db.oauth_states.insert_one({
        "state": state, "user_id": user["_id"], "platform": platform,
        "code_verifier": code_verifier,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    from urllib.parse import urlencode
    import hashlib, base64
    
    if platform == "twitter":
        # Twitter OAuth 2.0 with PKCE
        code_verifier, code_challenge = generate_pkce_pair()
        # Overwrite the default verifier from line 560
        await db.oauth_states.update_one({"state": state}, {"$set": {"code_verifier": code_verifier}})
        
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": config["scopes"],
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256"
        }
    elif platform == "youtube":
        # Google OAuth needs access_type=offline for refresh tokens
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": config["scopes"],
            "response_type": "code",
            "state": state,
            "access_type": "offline",
            "prompt": "consent"
        }
    elif platform == "instagram":
        # Instagram uses its own OAuth endpoint
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": config["scopes"],
            "response_type": "code",
            "state": state
        }
    else:
        # Facebook, LinkedIn - standard OAuth 2.0
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": config["scopes"],
            "response_type": "code",
            "state": state
        }
    
    return {"url": f"{config['auth_url']}?{urlencode(params)}"}

@api_router.get("/social-accounts/callback/{platform}")
async def oauth_callback(platform: str, code: str = Query(None), state: str = Query(None), error: str = Query(None)):
    """Handle OAuth callback. Exchange code for tokens, then redirect browser to frontend."""
    frontend_url = os.environ.get("FRONTEND_URL", "https://schedora.in/")
    dashboard_url = f"{frontend_url.rstrip('/')}/dashboard"
    
    # Handle OAuth errors (user denied, etc.)
    if error:
        logger.error(f"OAuth error for {platform}: {error}")
        from starlette.responses import RedirectResponse
        return RedirectResponse(url=f"{dashboard_url}?error={error}&platform={platform}")
    
    if not code or not state:
        from starlette.responses import RedirectResponse
        return RedirectResponse(url=f"{dashboard_url}?error=missing_params&platform={platform}")
    
    state_doc = await db.oauth_states.find_one({"state": state, "platform": platform})
    if not state_doc:
        from starlette.responses import RedirectResponse
        return RedirectResponse(url=f"{dashboard_url}?error=invalid_state&platform={platform}")
    
    user_id = state_doc["user_id"]
    code_verifier = state_doc.get("code_verifier", "challenge")
    await db.oauth_states.delete_one({"state": state})
    
    config = PLATFORM_CONFIGS.get(platform)
    client_id = os.environ.get(f"{platform.upper()}_CLIENT_ID")
    client_secret = os.environ.get(f"{platform.upper()}_CLIENT_SECRET")
    redirect_uri = os.environ.get(f"{platform.upper()}_REDIRECT_URI")
    
    if not all([client_id, client_secret, redirect_uri]):
        from starlette.responses import RedirectResponse
        return RedirectResponse(url=f"{dashboard_url}?error=not_configured&platform={platform}")
    
    try:
        # Platform-specific token exchange
        if platform == "twitter":
            # Twitter uses Basic Auth for token exchange
            import base64
            credentials = f"{client_id}:{client_secret}"
            b64_credentials = base64.b64encode(credentials.encode()).decode()
            resp = requests.post(
                config["token_url"],
                headers={"Authorization": f"Basic {b64_credentials}", "Content-Type": "application/x-www-form-urlencoded"},
                data={"code": code, "grant_type": "authorization_code", "redirect_uri": redirect_uri, "code_verifier": code_verifier},
                timeout=15
            )
        elif platform == "linkedin":
            # LinkedIn uses form-urlencoded
            resp = requests.post(
                config["token_url"],
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={"grant_type": "authorization_code", "code": code, "client_id": client_id, "client_secret": client_secret, "redirect_uri": redirect_uri},
                timeout=15
            )
        elif platform == "youtube":
            # YouTube/Google uses JSON
            resp = requests.post(
                config["token_url"],
                json={"code": code, "client_id": client_id, "client_secret": client_secret, "redirect_uri": redirect_uri, "grant_type": "authorization_code"},
                timeout=15
            )
        else:
            # Facebook/Instagram use form data
            resp = requests.post(
                config["token_url"],
                data={"client_id": client_id, "client_secret": client_secret, "code": code, "redirect_uri": redirect_uri, "grant_type": "authorization_code"},
                timeout=15
            )
        
        if resp.status_code != 200:
            logger.error(f"Token exchange failed for {platform}: {resp.status_code} {resp.text}")
            from starlette.responses import RedirectResponse
            return RedirectResponse(url=f"{dashboard_url}?error=token_failed&platform={platform}")
        
        tokens = resp.json()
        
        # Get username/profile info where possible
        username = None
        platform_user_id = tokens.get("user_id")
        
        if platform == "facebook":
            # Get user info from Facebook
            try:
                me_resp = requests.get(f"https://graph.facebook.com/v20.0/me?fields=name,id&access_token={tokens['access_token']}", timeout=10)
                if me_resp.status_code == 200:
                    me_data = me_resp.json()
                    username = me_data.get("name")
                    platform_user_id = me_data.get("id")
            except:
                pass
        elif platform == "instagram":
            try:
                me_resp = requests.get(f"https://graph.instagram.com/me?fields=id,username&access_token={tokens['access_token']}", timeout=10)
                if me_resp.status_code == 200:
                    me_data = me_resp.json()
                    username = me_data.get("username")
                    platform_user_id = me_data.get("id")
            except:
                pass
        elif platform == "linkedin":
            try:
                me_resp = requests.get("https://api.linkedin.com/v2/userinfo", headers={"Authorization": f"Bearer {tokens['access_token']}"}, timeout=10)
                if me_resp.status_code == 200:
                    me_data = me_resp.json()
                    username = me_data.get("name")
                    platform_user_id = me_data.get("sub")
            except:
                pass
        elif platform == "twitter":
            try:
                me_resp = requests.get("https://api.twitter.com/2/users/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}, timeout=10)
                if me_resp.status_code == 200:
                    me_data = me_resp.json()
                    username = me_data.get("data", {}).get("username")
                    platform_user_id = me_data.get("data", {}).get("id")
            except:
                pass
        
        account_id = f"acc_{uuid.uuid4().hex[:12]}"
        await db.social_accounts.insert_one({
            "account_id": account_id, "user_id": user_id, "platform": platform,
            "access_token": tokens.get("access_token"), "refresh_token": tokens.get("refresh_token"),
            "token_expires_at": (datetime.now(timezone.utc) + timedelta(seconds=int(tokens.get("expires_in", 3600)))).isoformat(),
            "platform_user_id": str(platform_user_id) if platform_user_id else None,
            "username": username,
            "status": "connected", "connected_at": datetime.now(timezone.utc).isoformat()
        })
        
        await log_audit(user_id, "account.connected", "social_account", account_id, {"platform": platform, "username": username})
        
        from starlette.responses import RedirectResponse
        return RedirectResponse(url=f"{dashboard_url}?connected={platform}")
    
    except Exception as e:
        logger.error(f"OAuth callback error for {platform}: {e}")
        from starlette.responses import RedirectResponse
        return RedirectResponse(url=f"{dashboard_url}?error=exception&platform={platform}")

@api_router.get("/social-accounts")
async def get_social_accounts(user: dict = Depends(get_current_user)):
    accounts = await db.social_accounts.find({"user_id": user["_id"]}, {"_id": 0, "access_token": 0, "refresh_token": 0}).to_list(100)
    return accounts

@api_router.post("/social-accounts")
async def connect_social_account(account: SocialAccountConnect, user: dict = Depends(get_current_user)):
    await enforce_account_limit(user)
    account_id = f"acc_{uuid.uuid4().hex[:12]}"
    doc = {"account_id": account_id, "user_id": user["_id"], "platform": account.platform, "platform_user_id": account.platform_user_id, "username": account.username, "access_token": account.access_token, "refresh_token": account.refresh_token, "status": "connected", "connected_at": datetime.now(timezone.utc).isoformat()}
    await db.social_accounts.insert_one(doc)
    doc.pop("access_token"); doc.pop("refresh_token")
    return doc

@api_router.delete("/social-accounts/{account_id}")
async def disconnect_social_account(account_id: str, user: dict = Depends(get_current_user)):
    result = await db.social_accounts.delete_one({"account_id": account_id, "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account disconnected"}


# ========== MEDIA UPLOAD ==========
@api_router.post("/upload")
async def upload_media(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user['_id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = await put_object(path, data, file.content_type or "application/octet-stream")
    await db.files.insert_one({"file_id": str(uuid.uuid4()), "storage_path": result["path"], "original_filename": file.filename, "content_type": file.content_type, "size": result["size"], "user_id": user["_id"], "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"url": f"/api/files/{result['path']}", "filename": file.filename}

@api_router.get("/files/{path:path}")
async def download_media(path: str, authorization: str = Header(None), auth: str = Query(None)):
    auth_header = authorization or (f"Bearer {auth}" if auth else None)
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = await get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))


# ========== POSTS WITH RECURRING ==========
@api_router.post("/posts")
async def create_post(post_data: PostCreate, user: dict = Depends(get_current_user)):
    if not check_rate_limit(str(user["_id"]), "create_post", 20):
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    await enforce_post_limit(user)
    plan = get_plan(user)
    if len(post_data.platforms) > plan["maxPlatforms"]:
        raise HTTPException(status_code=403, detail={
            "code": "platform_limit_reached",
            "message": f"Platform limit reached ({len(post_data.platforms)}/{plan['maxPlatforms']}). Upgrade your plan to post to more platforms.",
            "upgrade": True,
        })
    if post_data.recurrence and post_data.recurrence.startswith("every_"):
        enforce_feature(user, "customRecurrence")
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    status = post_data.status or "draft"
    if post_data.scheduled_time:
        status = "scheduled"
    review_status = "pending" if user.get("role") == "editor" else "approved"
    post_doc = {
        "post_id": post_id, "user_id": user["_id"], "content": post_data.content,
        "platforms": post_data.platforms, "platform_captions": post_data.platform_captions or {},
        "target_accounts": sanitize_target_accounts(post_data.target_accounts),
        "media_urls": normalize_media_urls(post_data.media_urls or []), "scheduled_time": post_data.scheduled_time,
        "status": status, "review_status": review_status, "created_by": user["_id"],
        "reviewed_by": None, "recurrence": post_data.recurrence or "none",
        "auto_retry": post_data.auto_retry if post_data.auto_retry is not None else user.get("settings", {}).get("auto_retry_failed", True),
        "retry_count": 0, "created_at": datetime.now(timezone.utc).isoformat(),
        "published_at": None, "logs": [], "error_message": None, "type": post_data.type
    }
    await db.posts.insert_one(post_doc)
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$inc": {"postsUsedThisMonth": 1}})
    
    # Token deduction for scheduled posts
    if status == "scheduled" and review_status == "approved":
        cost = calculate_token_cost(post_data.content)
        success, msg = await deduct_tokens(user, cost["tokensRequired"])
        if not success:
            raise HTTPException(status_code=402, detail=msg)
        await log_token_usage(user, "post", cost["type"], cost["tokensRequired"])
    
    await log_audit(user["_id"], "post.created", "post", post_id, {"platforms": post_data.platforms, "status": status, "recurrence": post_data.recurrence})

    if status == "scheduled" and post_data.scheduled_time and review_status == "approved":
        schedule_post(post_id, post_data.scheduled_time, post_data.recurrence)
    
    post_doc.pop("_id", None)
    return post_doc

@api_router.post("/posts/{post_id}/review")
async def review_post(post_id: str, action: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Only admins can review posts")
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    post = await db.posts.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.posts.update_one({"post_id": post_id}, {"$set": {"review_status": "approved" if action == "approve" else "rejected", "reviewed_by": user["_id"]}})
    await log_audit(user["_id"], f"post.{action}d", "post", post_id)
    if action == "approve" and post["status"] == "scheduled" and post.get("scheduled_time"):
        schedule_post(post_id, post["scheduled_time"], post.get("recurrence"))
    return {"message": f"Post {action}d successfully"}

@api_router.post("/posts/{post_id}/retry")
async def retry_post(post_id: str, user: dict = Depends(get_current_user)):
    """Manually retry a failed post."""
    post = await db.posts.find_one({"post_id": post_id, "status": "failed"}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or not failed")
    await db.posts.update_one({"post_id": post_id}, {"$set": {"status": "retrying"}})
    asyncio.create_task(publish_post(post_id))
    return {"message": "Retry initiated"}

@api_router.get("/posts")
async def get_posts(status: Optional[str] = None, review_status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user.get("role") == "editor":
        query["user_id"] = user["_id"]
    if status:
        query["status"] = status
    if review_status:
        query["review_status"] = review_status
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return posts

@api_router.get("/posts/{post_id}")
async def get_post(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@api_router.put("/posts/{post_id}")
async def update_post(post_id: str, post_data: PostCreate, user: dict = Depends(get_current_user)):
    existing = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    update_doc = {
        "content": post_data.content,
        "platforms": post_data.platforms,
        "platform_captions": post_data.platform_captions or {},
        "target_accounts": sanitize_target_accounts(post_data.target_accounts),
        "media_urls": normalize_media_urls(post_data.media_urls or []),
        "scheduled_time": post_data.scheduled_time,
        "recurrence": post_data.recurrence or "none",
    }
    await db.posts.update_one({"post_id": post_id}, {"$set": update_doc})
    refreshed = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if refreshed and refreshed.get("status") == "scheduled" and refreshed.get("scheduled_time"):
        schedule_post(post_id, refreshed["scheduled_time"], refreshed.get("recurrence"))
    return refreshed

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    result = await db.posts.delete_one({"post_id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    try:
        scheduler.remove_job(f"post_{post_id}")
    except:
        pass
    return {"message": "Post deleted"}


# ========== BULK POST CREATION ==========
@api_router.post("/posts/bulk-create")
async def bulk_create_posts(data: PostBulk, user: dict = Depends(get_current_user)):
    enforce_feature(user, "bulkUpload")
    success = 0
    failed = 0
    errors = []
    
    for idx, post in enumerate(data.posts):
        try:
            content = post.get("content")
            media_urls = normalize_media_urls(post.get("media_urls") or post.get("media_url"))
            target_accounts = sanitize_target_accounts(post.get("target_accounts"))
            
            # Validation
            if not content and not media_urls:
                failed += 1
                errors.append(f"Post {idx+1}: Content or media required")
                continue
                
            platforms_data = post.get("platforms")
            if not platforms_data:
                failed += 1
                errors.append(f"Post {idx+1}: No platforms selected")
                continue
            
            # Handle both list and comma-separated string
            if isinstance(platforms_data, str):
                platforms = [p.strip().lower() for p in platforms_data.split(",") if p.strip()]
            else:
                platforms = [p.lower() for p in platforms_data]

            scheduled_time = post.get("scheduled_time")
            if not scheduled_time:
                failed += 1
                errors.append(f"Post {idx+1}: Scheduled time required")
                continue

            try:
                # Ensure valid ISO format
                target_time = datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
            except:
                failed += 1
                errors.append(f"Post {idx+1}: Invalid date format ({scheduled_time})")
                continue

            post_id = f"post_{uuid.uuid4().hex[:12]}"
            doc = {
                "post_id": post_id,
                "user_id": user["_id"],
                "content": content or "",
                "platforms": platforms,
                "target_accounts": target_accounts,
                "media_urls": media_urls,
                "scheduled_time": scheduled_time,
                "status": "scheduled",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.posts.insert_one(doc)
            
            # Schedule in APScheduler
            try:
                scheduler.add_job(
                    publish_post,
                    "date",
                    run_date=target_time,
                    args=[post_id],
                    id=post_id,
                    replace_existing=True
                )
            except Exception as sched_err:
                print(f"Scheduling error: {sched_err}")
                # We still consider it a success as the doc is in DB, but alert internal
                
            success += 1
        except Exception as e:
            failed += 1
            errors.append(f"Post {idx+1}: {str(e)}")
            
    if success > 0:
        await log_event(user["_id"], "bulk_posts_created", {"count": success})
            
    return {"success": success, "failed": failed, "errors": errors}

async def bulk_upload_posts(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    enforce_feature(user, "bulkUpload")
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    content = await file.read()
    csv_file = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(csv_file)
    success, failed, errors = 0, 0, []
    for idx, row in enumerate(reader, start=2):
        try:
            media_hint = row.get("media_urls") or row.get("media_url")
            missing = [f for f in ['content', 'platforms', 'scheduled_time'] if not row.get(f)]
            if 'content' in missing and media_hint:
                missing.remove('content')
            if missing:
                errors.append(f"Row {idx}: Missing {', '.join(missing)}")
                failed += 1
                continue
            platforms = [p.strip() for p in row['platforms'].split(',')]
            post_id = f"post_{uuid.uuid4().hex[:12]}"
            post_doc = {"post_id": post_id, "user_id": user["_id"], "content": row['content'], "platforms": platforms, "platform_captions": {}, "media_urls": normalize_media_urls(row.get("media_urls") or row.get("media_url")), "scheduled_time": row['scheduled_time'], "status": "scheduled", "review_status": "approved" if user.get("role") != "editor" else "pending", "created_by": user["_id"], "reviewed_by": None, "recurrence": row.get("recurrence", "none"), "auto_retry": True, "retry_count": 0, "created_at": datetime.now(timezone.utc).isoformat(), "published_at": None, "logs": []}
            await db.posts.insert_one(post_doc)
            if post_doc["review_status"] == "approved":
                schedule_post(post_id, row['scheduled_time'], row.get("recurrence"))
            success += 1
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
            failed += 1
    if success > 0:
        await log_event(user["_id"], "csv_bulk_upload", {"count": success})
    return {"success": success, "failed": failed, "errors": errors}


# ========== AI ==========
@api_router.post("/ai/generate-content")
async def generate_content(request: AIContentRequest, user: dict = Depends(get_current_user)):
    enforce_feature(user, "aiEnabled")
    try:
        model = genai.GenerativeModel("gemma-3-4b-it", system_instruction="You are a social media content expert.")
        prompt = f"""Generate 3 social media post ideas for: "{request.topic}"
Platforms: {", ".join(request.platforms)}
For each: title, caption (150-200 chars), hashtags (5-7), suggested_time.
Return ONLY a JSON array: [{{"title":"...","caption":"...","hashtags":["..."],"suggested_time":"9:00 AM"}}]"""
        response_obj = await asyncio.to_thread(model.generate_content, prompt)
        response = response_obj.text
        import json
        text = response.strip()
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        try:
            ideas = json.loads(text.strip())
        except:
            ideas = [{"title": "Content Idea", "caption": response[:200], "hashtags": [], "suggested_time": "9:00 AM"}]
        return {"ideas": ideas}
    except Exception as e:
        logger.error(f"AI error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/improve-caption")
async def improve_caption(request: AIImproveRequest, user: dict = Depends(get_current_user)):
    enforce_feature(user, "aiEnabled")
    try:
        prompt = f"""Improve this {request.platform} caption:
"{request.caption}"
Hook in first 5 words, keep it concise, optimize for {request.platform}, and include a clear CTA. Return only the improved caption."""

        if not GEMINI_API_KEY:
            raise RuntimeError("Gemini API key not configured")

        model = genai.GenerativeModel("gemma-3-4b-it", system_instruction="You are a social media copywriting expert.")
        response_obj = await asyncio.to_thread(model.generate_content, prompt)
        response = (response_obj.text or "").strip()
        if not response:
            raise RuntimeError("Empty AI response")
        return {"improved_caption": response}
    except Exception as e:
        logger.warning(f"AI caption improvement fallback used: {e}")
        caption = request.caption.strip()
        if not caption:
            raise HTTPException(status_code=400, detail="Caption is required")

        improved = caption
        if not improved[0].isupper():
            improved = improved[0].upper() + improved[1:]
        if not improved.endswith((".", "!", "?")):
            improved += "."
        if len(improved) < 60:
            improved = f"{improved} Share your thoughts below."
        if "?" not in improved and "!" not in improved:
            improved += " What do you think?"
        return {"improved_caption": improved}

@api_router.post("/ai/optimize-post")
async def optimize_post(request: dict, user: dict = Depends(get_current_user)):
    enforce_feature(user, "aiEnabled")
    content = request.get("content", "")
    optimize_for = request.get("optimize_for", "no_link")
    
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")
    
    if not GEMINI_API_KEY:
        return {"optimized_content": content, "message": "AI not configured, returning original"}
    
    try:
        prompt = f"""Transform this social media post by removing any URLs/links and converting them into engaging call-to-action text.
        Original post: "{content}"
        Requirements: 
        - Remove any URLs or links
        - Convert the link mention into a compelling CTA like "Link in bio" or "Learn more at [brand]"
        - Keep it under 280 characters for Twitter
        - Make it engaging and actionable
        Return ONLY the optimized post text, nothing else."""
        
        model = genai.GenerativeModel("gemma-3-4b-it", system_instruction="You are a social media copywriting expert.")
        response_obj = await asyncio.to_thread(model.generate_content, prompt)
        optimized = (response_obj.text or "").strip()
        
        if not optimized:
            return {"optimized_content": content, "message": "AI returned empty, using original"}
        
        return {"optimized_content": optimized, "message": "Post optimized successfully"}
    except Exception as e:
        logger.error(f"AI optimize error: {e}")
        return {"optimized_content": content, "message": "AI error, using original"}


# ========== ANALYTICS ==========
@api_router.get("/analytics/overview")
async def get_analytics_overview(user: dict = Depends(get_current_user)):
    await sync_live_metrics_for_user(user["_id"])
    query = {"user_id": {"$in": user_id_variants(user["_id"])}}
    all_posts = await db.posts.find(query, {"_id": 0}).to_list(1000)
    analytics = await db.analytics.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(1000)

    now = datetime.now(timezone.utc)
    current_week_start = now - timedelta(days=7)
    previous_week_start = now - timedelta(days=14)

    def in_range(dt: Optional[datetime], start: datetime, end: datetime) -> bool:
        return bool(dt and start <= dt < end)

    def count_in_range(items: List[dict], field: str, start: datetime, end: datetime) -> int:
        return sum(1 for item in items if in_range(parse_iso_datetime(item.get(field)), start, end))

    def sum_in_range(items: List[dict], field: str, start: datetime, end: datetime) -> int:
        total = 0
        for item in items:
            dt = parse_iso_datetime(item.get("created_at"))
            if in_range(dt, start, end):
                total += int(item.get(field, 0) or 0)
        return total

    total_posts = len(all_posts)
    published_posts = sum(1 for post in all_posts if post.get("status") == "published")
    scheduled_posts = sum(1 for post in all_posts if post.get("status") == "scheduled")
    draft_posts = sum(1 for post in all_posts if post.get("status") == "draft")
    connected_accounts = await db.social_accounts.count_documents({"user_id": {"$in": user_id_variants(user["_id"])}, "status": "connected"})
    total_impressions = sum(int(a.get("impressions", 0) or 0) for a in analytics)
    total_engagement = sum(int(a.get("likes", 0) or 0) + int(a.get("comments", 0) or 0) + int(a.get("shares", 0) or 0) for a in analytics)
    avg_engagement_rate = sum(a.get("engagement_rate", 0) for a in analytics) / len(analytics) if analytics else 0
    best_posts = sorted(analytics, key=lambda x: x.get("engagement_rate", 0), reverse=True)[:5]

    platform_stats = {}
    for post in all_posts:
        if post.get("status") != "published":
            continue
        for platform in post.get("platforms", []):
            if platform not in platform_stats:
                platform_stats[platform] = {"posts": 0, "impressions": 0, "engagement": 0}
            platform_stats[platform]["posts"] += 1

    for a in analytics:
        p = a.get("platform", "unknown")
        if p not in platform_stats:
            platform_stats[p] = {"posts": 0, "impressions": 0, "engagement": 0}
        platform_stats[p]["impressions"] += int(a.get("impressions", 0) or 0)
        platform_stats[p]["engagement"] += int(a.get("likes", 0) or 0) + int(a.get("comments", 0) or 0)

    post_growth_current = count_in_range(all_posts, "created_at", current_week_start, now)
    post_growth_previous = count_in_range(all_posts, "created_at", previous_week_start, current_week_start)
    impressions_current = sum_in_range(analytics, "impressions", current_week_start, now)
    impressions_previous = sum_in_range(analytics, "impressions", previous_week_start, current_week_start)
    engagement_current = sum(
        int(a.get("likes", 0) or 0) + int(a.get("comments", 0) or 0) + int(a.get("shares", 0) or 0)
        for a in analytics
        if in_range(parse_iso_datetime(a.get("created_at")), current_week_start, now)
    )
    engagement_previous = sum(
        int(a.get("likes", 0) or 0) + int(a.get("comments", 0) or 0) + int(a.get("shares", 0) or 0)
        for a in analytics
        if in_range(parse_iso_datetime(a.get("created_at")), previous_week_start, current_week_start)
    )

    def percent_change(current: int, previous: int) -> str:
        if previous == 0:
            return "Live" if current > 0 else "No change"
        delta = ((current - previous) / previous) * 100
        direction = "+" if delta >= 0 else ""
        return f"{direction}{round(delta, 0)}% this week"

    insights = []
    if total_posts == 0:
        insights.append("No post history yet. Publish a few posts to unlock pattern-based insights.")
    else:
        insights.append(f"You have created {total_posts} posts so far, with {published_posts} already published.")
        if draft_posts > 0:
            insights.append(f"{draft_posts} posts are still in draft. Publishing them will make the dashboard more useful.")
        if scheduled_posts > 0:
            insights.append(f"{scheduled_posts} posts are currently scheduled and should update automatically as they publish.")
        if connected_accounts == 0:
            insights.append("Connect at least one social account to publish directly and collect live publish events.")

    if analytics:
        top_platform = max(platform_stats.items(), key=lambda item: item[1].get("posts", 0))[0] if platform_stats else None
        if top_platform:
            insights.append(f"{top_platform.title()} is currently your busiest publishing channel based on stored post history.")
    else:
        insights.append("Detailed engagement metrics will appear after successful platform publishes are recorded.")

    hour_counts: Dict[int, int] = {}
    for post in all_posts:
        source_time = post.get("published_at") or post.get("scheduled_time") or post.get("created_at")
        dt = parse_iso_datetime(source_time)
        if not dt:
            continue
        hour_counts[dt.hour] = hour_counts.get(dt.hour, 0) + 1

    best_times = []
    for hour, count in sorted(hour_counts.items(), key=lambda item: item[1], reverse=True)[:3]:
        label = datetime(2000, 1, 1, hour, 0).strftime("%I:%M %p").lstrip("0")
        best_times.append({
            "label": label,
            "count": count,
            "note": f"{count} scheduled/published post{'s' if count != 1 else ''} around this hour"
        })

    if not best_times:
        best_times = [
            {"label": "No data", "count": 0, "note": "Publish posts to discover real timing patterns"}
        ]

    return {
        "total_posts": total_posts,
        "published_posts": published_posts,
        "scheduled_posts": scheduled_posts,
        "draft_posts": draft_posts,
        "connected_accounts": connected_accounts,
        "total_impressions": total_impressions,
        "total_engagement": total_engagement,
        "avg_engagement_rate": round(avg_engagement_rate, 2),
        "best_posts": best_posts,
        "platform_stats": platform_stats,
        "trends": {
            "posts": percent_change(post_growth_current, post_growth_previous),
            "impressions": percent_change(impressions_current, impressions_previous),
            "engagement": percent_change(engagement_current, engagement_previous),
            "avg_rate": "Live" if analytics else "No data"
        },
        "insights": insights,
        "best_times": best_times
    }

@api_router.get("/analytics/posts/{post_id}")
async def get_post_analytics(post_id: str, user: dict = Depends(get_current_user)):
    analytics = await db.analytics.find({"post_id": post_id}, {"_id": 0}).to_list(100)
    if not analytics:
        raise HTTPException(status_code=404, detail="No analytics found")
    return analytics

@api_router.get("/analytics/export")
async def export_analytics(format: str = "csv", user: dict = Depends(get_current_user)):
    enforce_feature(user, "analyticsDetailed")
    analytics = await db.analytics.find({"user_id": user["_id"]}, {"_id": 0}).to_list(10000)
    if format == "csv":
        output = io.StringIO()
        if analytics:
            writer = csv.DictWriter(output, fieldnames=analytics[0].keys())
            writer.writeheader()
            writer.writerows(analytics)
        return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=analytics.csv"})
    return analytics


# ========== NOTIFICATIONS ==========
@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["_id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)


@api_router.get("/events/stream")
async def stream_events(request: Request, auth: Optional[str] = Query(None)):
    token = extract_bearer_token(request, auth)
    user = await get_current_user_from_token(token)
    user_id = str(user["_id"])
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    _realtime_subscribers.setdefault(user_id, []).append(queue)

    async def event_generator():
        try:
            yield f"event: connected\ndata: {JSONResponse(content={'type': 'connected'}).body.decode()}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20)
                    yield f"event: {event['type']}\ndata: {JSONResponse(content=event).body.decode()}\n\n"
                except asyncio.TimeoutError:
                    heartbeat = {"type": "heartbeat", "timestamp": datetime.now(timezone.utc).isoformat()}
                    yield f"event: heartbeat\ndata: {JSONResponse(content=heartbeat).body.decode()}\n\n"
        finally:
            subscribers = _realtime_subscribers.get(user_id, [])
            _realtime_subscribers[user_id] = [subscriber for subscriber in subscribers if subscriber is not queue]

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    })

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"notification_id": notification_id, "user_id": user["_id"]}, {"$set": {"read": True}})
    await publish_realtime_event(user["_id"], "notifications.updated", {"notification_id": notification_id})
    return {"message": "Notification marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["_id"], "read": False}, {"$set": {"read": True}})
    await publish_realtime_event(user["_id"], "notifications.updated", {"all_read": True})
    return {"message": "All notifications marked as read"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["_id"], "read": False})
    return {"count": count}


# ========== AUDIT LOGS ==========
@api_router.get("/audit-logs")
async def get_audit_logs(limit: int = 100, resource_type: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    query = {}
    if resource_type:
        query["resource_type"] = resource_type
    return await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)


# ========== ONBOARDING ==========
@api_router.post("/onboarding")
async def save_onboarding(data: OnboardingData, user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"creator_type": data.creator_type, "preferred_platforms": data.preferred_platforms, "onboarding_completed": True}})
    await log_audit(user["_id"], "user.onboarding_completed", "user", user["_id"])
    return {"message": "Onboarding complete"}

@api_router.get("/onboarding/status")
async def get_onboarding_status(user: dict = Depends(get_current_user)):
    return {"onboarding_completed": user.get("onboarding_completed", False)}


# ========== TEAMS ==========
@api_router.post("/teams/invite")
async def invite_team_member(invite: TeamInvite, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Only admins can invite members")
    token = secrets.token_urlsafe(32)
    await db.team_invitations.insert_one({"token": token, "email": invite.email.lower(), "role": invite.role, "team_id": user.get("team_id"), "invited_by": user["_id"], "expires_at": datetime.now(timezone.utc) + timedelta(days=7), "created_at": datetime.now(timezone.utc).isoformat()})
    await log_audit(user["_id"], "team.invite_sent", "team_invitation", token, {"email": invite.email, "role": invite.role})
    return {"message": "Invitation sent", "token": token}

@api_router.post("/teams/accept-invite")
async def accept_invite(token: str, user: dict = Depends(get_current_user)):
    invite = await db.team_invitations.find_one({"token": token})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invitation")
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"team_id": invite["team_id"], "role": invite["role"]}})
    await db.team_invitations.delete_one({"token": token})
    return {"message": "Joined team successfully"}

@api_router.get("/teams/members")
async def get_team_members(user: dict = Depends(get_current_user)):
    if not user.get("team_id"):
        return []
    members = await db.users.find({"team_id": user["team_id"]}, {"_id": 1, "email": 1, "name": 1, "role": 1}).to_list(100)
    for m in members:
        m["_id"] = str(m["_id"])
    return members


# ========== PUBLISHING + AUTO-RETRY + RECURRING ==========
def schedule_post(post_id: str, scheduled_time: str, recurrence: str = None):
    from apscheduler.triggers.interval import IntervalTrigger
    try:
        scheduled_dt = datetime.fromisoformat(scheduled_time)
        if scheduled_dt.tzinfo is None:
            scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)

        if recurrence and recurrence != "none":
            trigger = None
            # Custom interval patterns: every_N_minutes, every_N_hours, every_N_days
            import re as _re
            m = _re.match(r"every_(\d+)_(minutes?|hours?|days?)", recurrence)
            if m:
                n = int(m.group(1))
                unit = m.group(2).rstrip("s")
                if unit == "minute":
                    trigger = IntervalTrigger(minutes=n, start_date=scheduled_dt)
                elif unit == "hour":
                    trigger = IntervalTrigger(hours=n, start_date=scheduled_dt)
                elif unit == "day":
                    trigger = IntervalTrigger(days=n, start_date=scheduled_dt)
            elif recurrence == "daily":
                trigger = CronTrigger(hour=scheduled_dt.hour, minute=scheduled_dt.minute)
            elif recurrence == "weekly":
                trigger = CronTrigger(day_of_week=scheduled_dt.strftime("%a").lower()[:3], hour=scheduled_dt.hour, minute=scheduled_dt.minute)
            elif recurrence == "monthly":
                trigger = CronTrigger(day=scheduled_dt.day, hour=scheduled_dt.hour, minute=scheduled_dt.minute)

            if trigger:
                scheduler.add_job(publish_recurring_post, trigger=trigger, args=[post_id], id=f"post_{post_id}", replace_existing=True)
                logger.info(f"Recurring post {post_id} scheduled ({recurrence})")
            else:
                scheduler.add_job(enqueue_publish, trigger=DateTrigger(run_date=scheduled_dt), args=[post_id], id=f"post_{post_id}", replace_existing=True)
        else:
            scheduler.add_job(enqueue_publish, trigger=DateTrigger(run_date=scheduled_dt), args=[post_id], id=f"post_{post_id}", replace_existing=True)
            logger.info(f"Scheduled post {post_id} for {scheduled_time}")
    except Exception as e:
        logger.error(f"Error scheduling post {post_id}: {e}")

# ========== PLATFORM SPECIFIC PUBLISHING ==========

async def refresh_social_token(platform: str, account: dict):
    """Refresh OAuth token for a social account."""
    client_id = os.environ.get(f"{platform.upper()}_CLIENT_ID")
    client_secret = os.environ.get(f"{platform.upper()}_CLIENT_SECRET")
    
    if not account.get("refresh_token"):
        return None

    config = PLATFORM_CONFIGS.get(platform)
    if not config:
        return None

    try:
        data = {
            "grant_type": "refresh_token",
            "refresh_token": account["refresh_token"],
            "client_id": client_id,
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        if platform == "twitter":
            import base64
            auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
            headers["Authorization"] = f"Basic {auth}"
        else:
            data["client_secret"] = client_secret

        resp = requests.post(config["token_url"], data=data, headers=headers, timeout=15)
        if resp.status_code == 200:
            new_tokens = resp.json()
            update = {
                "access_token": new_tokens["access_token"],
                "refresh_token": new_tokens.get("refresh_token", account["refresh_token"]),
                "token_expires_at": (datetime.now(timezone.utc) + timedelta(seconds=int(new_tokens.get("expires_in", 3600)))).isoformat()
            }
            await db.social_accounts.update_one({"account_id": account["account_id"]}, {"$set": update})
            return new_tokens["access_token"]
    except Exception as e:
        logger.error(f"Error refreshing token for {platform}: {e}")
    
    return None

async def publish_to_twitter(account: dict, content: str, media_urls: list = None):
    """Post to Twitter (X) using v2 API."""
    token = account["access_token"]
    if not token:
        return {"status": "failed", "error": "Twitter access token missing. Reconnect this account."}
    if len(content or "") > 280:
        return {"status": "failed", "error": "Twitter posts must be 280 characters or fewer."}
    # Check if expired (simpler to just retry or refresh if near)
    # For now, let's try to publish and refresh if 401
    
    url = "https://api.twitter.com/2/tweets"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Schedora/1.0"
    }
    payload = {"text": content}
    
    # Simple media attachment (requires media_ids which needs v1.1 upload)
    # For now, we'll append the URL to the text or implement v1.1 if needed.
    if media_urls and len(media_urls) > 0:
        # Just text for now as per PRD "Post directly"
        pass
        
    resp = requests.post(url, json=payload, headers=headers, timeout=15)
    
    if resp.status_code == 401: # Token possibly expired
        new_token = await refresh_social_token("twitter", account)
        if new_token:
            headers["Authorization"] = f"Bearer {new_token}"
            resp = requests.post(url, json=payload, headers=headers, timeout=15)
            
    if resp.status_code in [200, 201]:
        return {"status": "success", "platform_post_id": resp.json().get("data", {}).get("id")}
    else:
        try:
            error_body = resp.json()
        except Exception:
            error_body = resp.text
        logger.error(f"Twitter publish failed for account {account.get('account_id')}: {resp.status_code} {error_body}")
        return {"status": "failed", "error": f"Twitter API error {resp.status_code}: {error_body}"}

async def publish_to_linkedin(account: dict, content: str, media_urls: list = None):
    """Post to LinkedIn using the Posts API with optional image upload."""
    token = account["access_token"]
    author_id = account["platform_user_id"]
    if not token or not author_id:
        return {"status": "failed", "error": "LinkedIn account is missing authorization details. Reconnect this account."}

    author_urn = f"urn:li:person:{author_id}"
    media_urls = normalize_media_urls(media_urls or [])
    payload = {
        "author": author_urn,
        "commentary": content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }

    if media_urls:
        image_url = media_urls[0]
        try:
            image_urn = await linkedin_upload_image(token, author_urn, image_url)
            payload["content"] = {
                "media": {
                    "id": image_urn
                }
            }
        except Exception as exc:
            logger.error(f"LinkedIn image upload failed for account {account.get('account_id')}: {exc}", exc_info=True)
            return {"status": "failed", "error": f"LinkedIn image upload failed: {exc}"}

    url = "https://api.linkedin.com/rest/posts"
    headers = linkedin_headers(token)
    resp = requests.post(url, json=payload, headers=headers, timeout=20)

    if resp.status_code == 401:
        new_token = await refresh_social_token("linkedin", account)
        if new_token:
            headers = linkedin_headers(new_token)
            resp = requests.post(url, json=payload, headers=headers, timeout=15)

    if resp.status_code in [200, 201]:
        platform_post_id = resp.headers.get("x-restli-id")
        if not platform_post_id:
            try:
                platform_post_id = resp.json().get("id")
            except Exception:
                platform_post_id = None
        return {"status": "success", "platform_post_id": platform_post_id}
    else:
        try:
            error_body = resp.json()
        except Exception:
            error_body = resp.text
        logger.error(f"LinkedIn publish failed for account {account.get('account_id')}: {resp.status_code} {error_body}")
        return {"status": "failed", "error": f"LinkedIn API error {resp.status_code}: {error_body}"}

async def publish_recurring_post(post_id: str):
    """Publish a recurring post by cloning it."""
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        return
    # Create a new instance of the post
    new_post_id = f"post_{uuid.uuid4().hex[:12]}"
    await db.posts.insert_one({
        **post,
        "post_id": new_post_id,
        "status": "publishing",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    # Enqueue the publish
    enqueue_publish(new_post_id)
    logger.info(f"Recurring post {post_id} enqueued as {new_post_id}")

async def publish_post(post_id: str, is_recurring_instance: bool = False):
    try:
        post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
        if not post:
            return
            
        user_id = post["user_id"]
        platforms = post["platforms"]
        results = []
        all_success = True
        
        # If recurring instance, we create a new doc for this specific run
        if is_recurring_instance:
            target_post_id = f"post_{uuid.uuid4().hex[:12]}"
            await db.posts.insert_one({
                **post, 
                "post_id": target_post_id, 
                "status": "publishing", 
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        else:
            target_post_id = post_id
            await db.posts.update_one({"post_id": post_id}, {"$set": {"status": "publishing"}})

        # Fetch connected accounts for this user
        accounts = await db.social_accounts.find({"user_id": user_id, "status": "connected"}).to_list(100)
        target_accounts = sanitize_target_accounts(post.get("target_accounts"))
        post['media'] = [{'url': url} for url in post.get('media_urls', [])]

        for platform in platforms:
            selected_accounts = select_target_accounts(accounts, platform, target_accounts)
            if not selected_accounts:
                results.append({"timestamp": datetime.now(timezone.utc).isoformat(), "status": "failed", "platform": platform, "message": "Account not connected or disconnected"})
                all_success = False
                continue

            for account in selected_accounts:
                # Call real API
                post['account'] = account
                try:
                    adapter = ADAPTERS[platform]()
                    await adapter.validate_content(post)
                    res = await adapter.publish(post, account)
                except ValueError as e:
                    res = {"status": "failed", "error": str(e)}
                except Exception as e:
                    res = {"status": "failed", "error": f"Unexpected error: {str(e)}"}

                if res["status"] == "success":
                    results.append({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "status": "success",
                        "platform": platform,
                        "account_id": account.get("account_id"),
                        "username": account.get("username"),
                        "platform_post_id": res.get("platform_post_id")
                    })
                    metrics = estimate_publish_metrics(post.get("content", ""), platform, 1)
                    await db.analytics.insert_one({
                        "user_id": user_id,
                        "post_id": target_post_id,
                        "platform": platform,
                        "account_id": account.get("account_id"),
                        "account_username": account.get("username"),
                        "event": "post_published",
                        "impressions": metrics["impressions"],
                        "likes": metrics["likes"],
                        "comments": metrics["comments"],
                        "shares": metrics["shares"],
                        "engagement_rate": metrics["engagement_rate"],
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                else:
                    results.append({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "status": "failed",
                        "platform": platform,
                        "account_id": account.get("account_id"),
                        "username": account.get("username"),
                        "message": res.get("error")
                    })
                    all_success = False

        all_success = all(r["status"] == "success" for r in results)
        all_failed = all(r["status"] == "failed" for r in results)

        if all_success:
            status = "published"
            published_at = datetime.now(timezone.utc).isoformat()
            await db.posts.update_one({"post_id": target_post_id}, {
                "$set": {
                    "status": status,
                    "published_at": published_at
                },
                "$push": {"logs": {"$each": results}}
            })
            await log_audit(user_id, "post.published", "post", target_post_id, {"platforms": platforms})
            await create_notification(user_id, "success", "Post Published", f"Your post to {', '.join(platforms)} was published successfully.", target_post_id)
            logger.info(f"Finished processing post {target_post_id} - status: {status}")
            return {"success": True}

        elif all_failed:
            retry_count = post.get("retry_count", 0)
            if retry_count < 3:
                delay_seconds = 60 * (2 ** (retry_count + 1))
                enqueue_retry(post_id, delay_seconds)
                status = "retrying"
                results.append({"timestamp": datetime.now(timezone.utc).isoformat(), "status": "retry", "message": f"Scheduled retry in {delay_seconds} seconds (attempt {retry_count+1}/3)"})
                await db.posts.update_one({"post_id": target_post_id}, {"$set": {"status": status}, "$inc": {"retry_count": 1}, "$push": {"logs": {"$each": results}}})
                await create_notification(user_id, "info", "Post Retrying", f"Post failed, retrying in {delay_seconds} seconds.", target_post_id)
                logger.info(f"Finished processing post {target_post_id} - status: {status}")
                return {"success": False}
            else:
                status = "failed"
                error_message = "Max retries exceeded"
                results.append({"timestamp": datetime.now(timezone.utc).isoformat(), "status": "failed", "message": error_message})
                await db.posts.update_one({"post_id": target_post_id}, {"$set": {"status": status, "error_message": error_message}, "$push": {"logs": {"$each": results}}})
                await create_notification(user_id, "error", "Post Failed", "Post failed after max retries.", target_post_id)
                logger.info(f"Finished processing post {target_post_id} - status: {status}")
                return {"success": False}

        else:
            # partial success
            status = "partial"
            await db.posts.update_one({"post_id": target_post_id}, {
                "$set": {
                    "status": status
                },
                "$push": {"logs": {"$each": results}}
            })
            await create_notification(user_id, "warning", "Post Partial Success", "Post published to some platforms but failed on others.", target_post_id)
            logger.info(f"Finished processing post {target_post_id} - status: {status}")
            return {"success": True}

    except Exception as e:
        logger.error(f"Error publishing post {post_id}: {e}")
        log_entry = {"timestamp": datetime.now(timezone.utc).isoformat(), "status": "failed", "message": str(e)}
        await db.posts.update_one({"post_id": post_id}, {"$set": {"status": "failed"}, "$push": {"logs": log_entry}, "$inc": {"retry_count": 1}})

        post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
        if post:
            await create_notification(post["user_id"], "error", "Post Failed", "Your post failed to publish. Tap to retry.", post_id)

            # Retry logic
            if post.get("retry_count", 0) < 3:
                enqueue_retry(post_id, 60 * (2 ** post.get("retry_count", 0)))
                await db.posts.update_one({"post_id": post_id}, {"$set": {"status": "retrying"}})
                log_entry = {"timestamp": datetime.now(timezone.utc).isoformat(), "status": "retry", "message": f"Scheduled retry in {60 * (2 ** post.get('retry_count', 0))} seconds (attempt {post.get('retry_count', 0)+1}/3)"}
                await db.posts.update_one({"post_id": post_id}, {"$push": {"logs": log_entry}})
                await create_notification(post["user_id"], "info", "Post Retrying", f"Will retry in {60 * (2 ** post.get('retry_count', 0))} seconds.", post_id)

            # Email notification on failure
            user = await db.users.find_one({"_id": ObjectId(post["user_id"]) if len(post["user_id"]) == 24 else None})
            if not user:
                user = await db.users.find_one({"_id": post["user_id"]})
            if user and user.get("settings", {}).get("email_on_failure"):
                body_html = f"""
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#444444;">Your scheduled post to <strong>{", ".join(post["platforms"])}</strong> failed to publish.</p>
                <div style="padding:16px;border:2px solid #111111;border-radius:16px;background:#fff8f3;box-shadow:4px 4px 0 #111111;margin-bottom:16px;">
                  <div style="font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:#ff4500;margin-bottom:8px;">Post preview</div>
                  <div style="font-size:14px;line-height:1.6;color:#222222;">{post["content"][:140]}{'...' if len(post["content"]) > 140 else ''}</div>
                </div>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#555555;">{"We will retry shortly." if post.get("retry_count", 0) < 3 else "Please retry manually from your dashboard."}</p>
                """
                await send_email(
                    user["email"],
                    "Schedora: Post Failed to Publish",
                    build_email_shell(
                        title="Post failed to publish",
                        intro="We hit a publishing issue and wanted to keep you in the loop.",
                        body_html=body_html,
                        cta_label="Open Dashboard",
                        cta_href=f"{os.environ.get('FRONTEND_URL','')}/dashboard"
                    )
                )
        return {"success": False}


# ========== WEEKLY DIGEST ==========
async def send_weekly_digest():
    """Send weekly performance digest to all users with email_weekly_digest enabled."""
    users = await db.users.find({"settings.email_weekly_digest": True}, {"_id": 1, "email": 1, "name": 1}).to_list(10000)
    for user in users:
        user_id = str(user["_id"])
        # Count posts in last 7 days
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        published = await db.posts.count_documents({"user_id": user_id, "status": "published", "published_at": {"$gte": week_ago}})
        failed = await db.posts.count_documents({"user_id": user_id, "status": "failed", "created_at": {"$gte": week_ago}})
        scheduled = await db.posts.count_documents({"user_id": user_id, "status": "scheduled"})
        
        await send_email(
            user["email"],
            "Schedora: Your Weekly Content Digest",
            build_email_shell(
                title="Your weekly content digest",
                intro=f"Hi {user.get('name', 'there')}, here’s your week in review.",
                body_html=f"""
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;">
                  <tr>
                    <td style="padding:0 6px 0 0;">
                      <div style="padding:16px;border:2px solid #111111;border-radius:16px;background:#ffffff;box-shadow:4px 4px 0 #111111;text-align:center;">
                        <div style="font-size:12px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#666666;margin-bottom:8px;">Published</div>
                        <div style="font-size:34px;line-height:1;font-weight:900;color:#111111;">{published}</div>
                      </div>
                    </td>
                    <td style="padding:0 6px;">
                      <div style="padding:16px;border:2px solid #111111;border-radius:16px;background:#fff8f3;box-shadow:4px 4px 0 #111111;text-align:center;">
                        <div style="font-size:12px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#666666;margin-bottom:8px;">Failed</div>
                        <div style="font-size:34px;line-height:1;font-weight:900;color:#111111;">{failed}</div>
                      </div>
                    </td>
                    <td style="padding:0 0 0 6px;">
                      <div style="padding:16px;border:2px solid #111111;border-radius:16px;background:#fffdf0;box-shadow:4px 4px 0 #111111;text-align:center;">
                        <div style="font-size:12px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#666666;margin-bottom:8px;">Upcoming</div>
                        <div style="font-size:34px;line-height:1;font-weight:900;color:#111111;">{scheduled}</div>
                      </div>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0 0;font-size:13px;line-height:1.6;color:#555555;">Keep creating great content. Your consistency is the momentum.</p>
                """,
                cta_label="View Full Analytics",
                cta_href=f"{os.environ.get('FRONTEND_URL','')}/analytics"
            )
        )
    logger.info(f"Weekly digest sent to {len(users)} users")


# ========== FACEBOOK DEAUTHORIZE & DATA DELETION ==========
@api_router.post("/facebook/deauthorize")
async def facebook_deauthorize(request: Request):
    """Called by Facebook when a user removes the app. Deauthorize callback URL."""
    try:
        body = await request.body()
        logger.info(f"Facebook deauthorize callback received: {body[:200]}")
        
        # Parse signed_request if present
        try:
            data = await request.json()
            signed_request = data.get("signed_request", "")
        except:
            signed_request = body.decode("utf-8", errors="ignore")
        
        if signed_request and "." in signed_request:
            import base64, json as json_mod
            parts = signed_request.split(".", 1)
            payload_encoded = parts[1]
            padding = 4 - len(payload_encoded) % 4
            payload_encoded += "=" * padding
            try:
                payload_data = base64.urlsafe_b64decode(payload_encoded)
                payload = json_mod.loads(payload_data)
                user_id_meta = payload.get("user_id")
                
                if user_id_meta:
                    # Mark accounts as disconnected
                    await db.social_accounts.update_many(
                        {"platform_user_id": str(user_id_meta), "platform": {"$in": ["facebook", "instagram"]}},
                        {"$set": {"status": "disconnected"}}
                    )
                    logger.info(f"Facebook deauthorize: disconnected accounts for Meta user {user_id_meta}")
            except:
                pass
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Facebook deauthorize error: {e}")
        return {"status": "ok"}

@api_router.get("/facebook/deauthorize")
async def facebook_deauthorize_get():
    """GET handler for Facebook verification."""
    return {"status": "ok"}


# ========== DATA DELETION (Meta requirement) ==========
class DataDeletionRequest(BaseModel):
    signed_request: Optional[str] = None

@api_router.post("/data-deletion/callback")
async def data_deletion_callback(request: Request):
    """Handle data deletion callback from Meta (Facebook/Instagram).
    Meta sends a signed_request when a user requests data deletion."""
    try:
        body = await request.json()
        signed_request = body.get("signed_request", "")
        
        # Parse the signed_request (base64url encoded)
        import base64, json as json_mod, hashlib, hmac
        parts = signed_request.split(".", 1)
        if len(parts) == 2:
            encoded_sig = parts[0]
            payload_encoded = parts[1]
            
            # Decode payload
            padding = 4 - len(payload_encoded) % 4
            payload_encoded += "=" * padding
            payload_data = base64.urlsafe_b64decode(payload_encoded)
            payload = json_mod.loads(payload_data)
            
            user_id_meta = payload.get("user_id")
            
            if user_id_meta:
                # Find and delete user data by platform_user_id
                accounts = await db.social_accounts.find({"platform_user_id": str(user_id_meta)}).to_list(100)
                for account in accounts:
                    uid = account["user_id"]
                    # Delete all user data
                    await db.posts.delete_many({"user_id": uid})
                    await db.social_accounts.delete_many({"user_id": uid})
                    await db.notifications.delete_many({"user_id": uid})
                    await db.analytics.delete_many({"user_id": uid})
                    await db.audit_logs.delete_many({"user_id": uid})
                    await db.files.update_many({"user_id": uid}, {"$set": {"is_deleted": True}})
                    await db.users.delete_one({"_id": ObjectId(uid) if len(str(uid)) == 24 else uid})
                    logger.info(f"Data deletion completed for Meta user {user_id_meta}, internal user {uid}")
                
                confirmation_code = f"del_{uuid.uuid4().hex[:12]}"
                return {
                    "url": f"{os.environ.get('FRONTEND_URL', '')}/data-deletion?code={confirmation_code}",
                    "confirmation_code": confirmation_code
                }
        
        # Fallback for unsigned requests
        confirmation_code = f"del_{uuid.uuid4().hex[:12]}"
        return {
            "url": f"{os.environ.get('FRONTEND_URL', '')}/data-deletion?code={confirmation_code}",
            "confirmation_code": confirmation_code
        }
    except Exception as e:
        logger.error(f"Data deletion error: {e}")
        return {"url": os.environ.get('FRONTEND_URL', ''), "confirmation_code": "error"}

@api_router.post("/account/delete")
async def delete_own_account(user: dict = Depends(get_current_user)):
    """Delete current user's account and all associated data."""
    uid = user["_id"]
    await db.posts.delete_many({"user_id": uid})
    await db.social_accounts.delete_many({"user_id": uid})
    await db.notifications.delete_many({"user_id": uid})
    await db.analytics.delete_many({"user_id": uid})
    await db.audit_logs.delete_many({"user_id": uid})
    await db.files.update_many({"user_id": uid}, {"$set": {"is_deleted": True}})
    await db.user_sessions.delete_many({"user_id": uid})
    await db.users.delete_one({"_id": ObjectId(uid)})
    logger.info(f"Account self-deleted: {uid}")
    return {"message": "Account and all data deleted"}


# ========== ADMIN DASHBOARD ==========
@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    total_users = await db.users.count_documents({})
    verified_users = await db.users.count_documents({"status": "verified"})
    total_posts = await db.posts.count_documents({"status": "published"})
    connected_accounts = await db.social_accounts.count_documents({"status": "connected"})

    platforms = ["twitter", "linkedin", "instagram", "facebook", "youtube"]
    platform_stats = {}
    for p in platforms:
        platform_stats[p] = await db.social_accounts.count_documents({"platform": p, "status": "connected"})

    # Revenue from payments
    all_payments = await db.payments.find({}).to_list(10000)
    total_revenue = sum(p.get("amount", 0) for p in all_payments)
    token_revenue = sum(p.get("amount", 0) for p in all_payments if p.get("type") == "token_purchase")
    plan_revenue = total_revenue - token_revenue

    # Token usage stats
    token_logs = await db.token_logs.find({}).to_list(10000)
    total_tokens_used = sum(t.get("tokens", 0) for t in token_logs)
    token_breakdown = {}
    for t in token_logs:
        k = t.get("type", "unknown")
        token_breakdown[k] = token_breakdown.get(k, 0) + t.get("tokens", 0)

    # Active users (posted in last 7 days)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    active_users = await db.posts.distinct("user_id", {"created_at": {"$gte": seven_days_ago}})

    # Feedback summary
    all_feedback = await db.feedback.find({}).to_list(10000)
    avg_rating = round(sum(f.get("rating", 0) for f in all_feedback) / len(all_feedback), 1) if all_feedback else 0
    tag_counts: dict = {}
    for f in all_feedback:
        for tag in f.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    top_tags = sorted(tag_counts.items(), key=lambda x: -x[1])[:5]

    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "total_posts": total_posts,
        "connected_accounts": connected_accounts,
        "platform_stats": platform_stats,
        "revenue": {
            "total": total_revenue,
            "from_plans": plan_revenue,
            "from_tokens": token_revenue,
        },
        "tokens": {
            "total_used": total_tokens_used,
            "breakdown": token_breakdown,
        },
        "active_users_7d": len(active_users),
        "feedback": {
            "total": len(all_feedback),
            "avg_rating": avg_rating,
            "top_tags": [{"tag": k, "count": v} for k, v in top_tags],
        },
    }


@api_router.get("/admin/feedback")
async def get_admin_feedback(user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return await db.feedback.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)


@api_router.get("/admin/users")
async def get_admin_users(user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    all_users = await db.users.find(
        {}, {"email": 1, "name": 1, "planType": 1, "tokens": 1, "postsUsedThisMonth": 1, "created_at": 1, "role": 1}
    ).to_list(500)

    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    result = []
    for u in all_users:
        uid = u["_id"]
        post_count = await db.posts.count_documents({"user_id": uid})
        recent_posts = await db.posts.count_documents({"user_id": uid, "created_at": {"$gte": seven_days_ago}})
        old_posts = await db.posts.count_documents({"user_id": uid, "created_at": {"$gte": thirty_days_ago}})
        token_used = await db.token_logs.count_documents({"user_id": uid})

        result.append({
            "id": str(uid),
            "email": u.get("email", ""),
            "name": u.get("name", ""),
            "plan": u.get("planType", "free"),
            "tokens": u.get("tokens", 0),
            "postsThisMonth": u.get("postsUsedThisMonth", 0),
            "totalPosts": post_count,
            "recentPosts7d": recent_posts,
            "tokenActionsTotal": token_used,
            "status": "active" if recent_posts > 0 else ("at_risk" if old_posts > 0 else "inactive"),
            "joinedAt": u.get("created_at", ""),
        })

    result.sort(key=lambda x: -x["tokens"])
    return result


# ─── Token Purchase Endpoints ─────────────────────────────────────────────────

@api_router.get("/tokens/packs")
async def get_token_packs():
    return [{"id": k, **v} for k, v in TOKEN_PACKS.items()]


@api_router.get("/tokens/history")
async def get_token_history(user: dict = Depends(get_current_user), limit: int = 50):
    logs = await db.token_logs.find({"user_id": user["_id"]}).sort("createdAt", -1).limit(limit).to_list(limit)
    for log in logs:
        log["_id"] = str(log["_id"])
        log["user_id"] = str(log.get("user_id", ""))
    return logs


@api_router.get("/tokens/stats")
async def get_token_stats(user: dict = Depends(get_current_user)):
    balance = user.get("tokens", 0)
    logs = await db.token_logs.find({"user_id": user["_id"]}).to_list(10000)

    breakdown: dict = {}
    for log in logs:
        k = log.get("type", "unknown")
        breakdown[k] = breakdown.get(k, 0) + log.get("tokens", 0)

    total_used = sum(breakdown.values())

    # Smart insight
    insights = []
    url_used = breakdown.get("url", 0)
    standard_used = breakdown.get("standard", 0)
    if url_used > standard_used and total_used > 0:
        insights.append("You post many links — switching to standard posts can cut your credit usage by up to 85%.")
    if balance < 20:
        insights.append("Your balance is low. Consider buying more credits to keep scheduling uninterrupted.")
    if breakdown.get("ai_caption", 0) > 10:
        insights.append("You're getting great value from AI captions — keep it up!")

    # Posts left estimate (based on avg cost)
    avg_cost = (total_used / len(logs)) if logs else 3
    posts_left = int(balance / avg_cost) if avg_cost > 0 else int(balance / 3)

    plan = get_plan(user)
    return {
        "balance": balance,
        "postsLeft": posts_left,
        "totalUsed": total_used,
        "breakdown": breakdown,
        "insights": insights,
        "planType": user.get("planType", "free"),
        "planName": plan.get("name", "Free"),
        "recentLogs": [
            {
                "action": log.get("action", ""),
                "type": log.get("type", ""),
                "tokens": log.get("tokens", 0),
                "createdAt": log.get("createdAt", "").isoformat() if hasattr(log.get("createdAt", ""), "isoformat") else str(log.get("createdAt", "")),
            }
            for log in logs[:20]
        ],
    }


class BuyTokensRequest(BaseModel):
    pack_id: str


@api_router.post("/tokens/buy")
async def buy_tokens_order(data: BuyTokensRequest, user: dict = Depends(get_current_user)):
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment service not configured.")
    pack = TOKEN_PACKS.get(data.pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid token pack selected.")
    client_rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    order = client_rz.order.create({
        "amount": pack["price"] * 100,
        "currency": "INR",
        "receipt": f"tok_{str(user['_id'])[:8]}_{data.pack_id}",
        "notes": {"user_id": str(user["_id"]), "pack_id": data.pack_id, "tokens": pack["tokens"]},
    })
    return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"], "key": RAZORPAY_KEY_ID, "tokens": pack["tokens"], "pack": pack}


class VerifyTokenPurchaseRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    pack_id: str


@api_router.post("/tokens/verify-purchase")
async def verify_token_purchase(data: VerifyTokenPurchaseRequest, user: dict = Depends(get_current_user)):
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment service not configured.")
    pack = TOKEN_PACKS.get(data.pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack.")
    try:
        client_rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        client_rz.utility.verify_payment_signature({
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed.")
    await db.users.update_one({"_id": user["_id"]}, {"$inc": {"tokens": pack["tokens"]}})
    await db.payments.insert_one({
        "user_id": user["_id"], "type": "token_purchase", "pack_id": data.pack_id,
        "tokens": pack["tokens"], "amount": pack["price"],
        "razorpay_order_id": data.razorpay_order_id, "razorpay_payment_id": data.razorpay_payment_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await log_token_usage(user, "token_purchase", "credit", -pack["tokens"])
    logger.info(f"Token purchase: user {user['_id']} bought {pack['tokens']} tokens ({data.pack_id})")
    return {"success": True, "tokens_added": pack["tokens"], "message": f"{pack['tokens']} credits added to your account!"}


# ========== ADMIN SEEDING ==========
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@schedora.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"_id": ObjectId(), "email": admin_email, "password_hash": hash_password(admin_password), "name": "Admin", "role": "admin", "team_id": None, "onboarding_completed": True, "creator_type": "business", "planType": "business", "subscriptionStatus": "active", "preferred_platforms": ["instagram", "linkedin", "twitter"], "settings": {"auto_retry_failed": True, "email_on_failure": True, "email_weekly_digest": True}, "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info(f"Admin user created: {admin_email}")
    else:
        update = {}
        if not existing.get("password_hash") or not verify_password(admin_password, existing.get("password_hash", "")):
            update["password_hash"] = hash_password(admin_password)
        if "role" not in existing:
            update["role"] = "admin"
        if "onboarding_completed" not in existing:
            update["onboarding_completed"] = True
        if "settings" not in existing:
            update["settings"] = {"auto_retry_failed": True, "email_on_failure": True, "email_weekly_digest": True}
        if "planType" not in existing:
            update["planType"] = "business"
        if "subscriptionStatus" not in existing:
            update["subscriptionStatus"] = "active"
        if update:
            await db.users.update_one({"email": admin_email}, {"$set": update})

async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.posts.create_index("user_id")
    await db.posts.create_index("status")
    await db.analytics.create_index("user_id")
    await db.notifications.create_index("user_id")
    await db.oauth_states.create_index("expires_at", expireAfterSeconds=0)
    logger.info("Database indexes created")

def generate_pkce_pair():
    """Generate PKCE code_verifier and code_challenge."""
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode('utf-8')).digest()
    ).decode('utf-8').rstrip('=')
    return code_verifier, code_challenge


@app.on_event("startup")
async def startup():
    try:

        scheduler.start()
        await seed_admin()
        await create_indexes()
        # Schedule weekly digest: every Monday at 9 AM UTC
        scheduler.add_job(send_weekly_digest, CronTrigger(day_of_week="mon", hour=9, minute=0), id="weekly_digest", replace_existing=True)
        logger.info("All systems initialized")
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown():
    client.close()
    scheduler.shutdown()


# ─── Pricing & Payment Endpoints ─────────────────────────────────────────────

@api_router.get("/pricing/plans")
async def get_pricing_plans():
    plans_out = []
    for key, plan in PLANS.items():
        plans_out.append({
            "id": key, **plan,
            "maxPostsPerMonth": plan["maxPostsPerMonth"] if plan["maxPostsPerMonth"] is not None else "unlimited"
        })
    return plans_out

@api_router.get("/user/plan")
async def get_user_plan(user: dict = Depends(get_current_user)):
    plan = get_plan(user)
    is_admin = user.get("role") in ADMIN_ROLES
    connected = await db.social_accounts.count_documents({"user_id": user["_id"], "status": "connected"})
    plan_type = "admin" if is_admin else user.get("planType", "free")
    return {
        "planType": plan_type,
        "isAdmin": is_admin,
        "role": user.get("role", "user"),
        "plan": {**plan, "maxPostsPerMonth": plan["maxPostsPerMonth"] if plan["maxPostsPerMonth"] is not None else "unlimited"},
        "postsUsedThisMonth": user.get("postsUsedThisMonth", 0),
        "connectedAccountsCount": connected,
        "subscriptionStatus": user.get("subscriptionStatus", "inactive"),
        "planExpiryDate": user.get("planExpiryDate"),
        "tokens": user.get("tokens", 0),
    }

class CreateOrderRequest(BaseModel):
    plan: str

@api_router.post("/create-order")
async def create_razorpay_order(data: CreateOrderRequest, user: dict = Depends(get_current_user)):
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment service not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.")
    if data.plan not in ["pro", "business"]:
        raise HTTPException(status_code=400, detail="Invalid plan selected")
    plan = PLANS[data.plan]
    client_rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    order = client_rz.order.create({
        "amount": plan["price"] * 100,
        "currency": "INR",
        "receipt": f"order_{str(user['_id'])[:8]}_{data.plan}",
        "notes": {"user_id": str(user["_id"]), "plan": data.plan},
    })
    return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"], "key": RAZORPAY_KEY_ID}

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str

@api_router.post("/verify-payment")
async def verify_payment(data: VerifyPaymentRequest, user: dict = Depends(get_current_user)):
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    if data.plan not in ["pro", "business"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    try:
        client_rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        client_rz.utility.verify_payment_signature({
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed. Please contact support.")
    expiry = datetime.now(timezone.utc) + timedelta(days=30)
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"planType": data.plan, "subscriptionStatus": "active", "planExpiryDate": expiry.isoformat(), "postsUsedThisMonth": 0}}
    )
    await db.payments.insert_one({
        "user_id": user["_id"], "plan": data.plan, "amount": PLANS[data.plan]["price"],
        "razorpay_order_id": data.razorpay_order_id, "razorpay_payment_id": data.razorpay_payment_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"Payment verified for user {user['_id']}: upgraded to {data.plan}")
    return {"success": True, "plan": data.plan, "message": f"Successfully upgraded to {PLANS[data.plan]['name']} plan!"}


# Job posts feature removed.

# Job posts feature removed.

@app.get("/health")
async def health_check():
    db_ok = await ping_database()
    status = "healthy" if db_ok else "degraded"
    payload = {
        "status": status,
        "service": "schedora-backend",
        "database": "connected" if db_ok else "unavailable",
    }
    if not db_ok:
        return JSONResponse(status_code=503, content=payload)
    return payload

@app.get("/")
async def root():
    return {"message": "Schedora API", "status": "running"}

app.include_router(api_router)
