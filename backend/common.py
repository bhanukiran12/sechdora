# backend/common.py - Break all circular imports
import logging, os, requests, asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from urllib.parse import urlparse, unquote
from datetime import datetime, timezone, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
if "tlsAllowInvalidCertificates" not in mongo_url:
    separator = "&" if "?" in mongo_url else "?"
    mongo_url += f"{separator}tls=true&tlsAllowInvalidCertificates=true"
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'schedoradb')]

LINKEDIN_API_VERSION = os.environ.get("LINKEDIN_API_VERSION", "202603")

def linkedin_headers(token, include_content_type=True, include_version=True):
    headers = {"Authorization": f"Bearer {token}", "X-Restli-Protocol-Version": "2.0.0"}
    if include_version: headers["Linkedin-Version"] = LINKEDIN_API_VERSION
    if include_content_type: headers["Content-Type"] = "application/json"
    return headers

async def fetch_media_binary(media_url):  # From server.py
    parsed = urlparse(media_url)
    path = parsed.path or ""
    # [copy full function from server.py line ~1050]
    resp = requests.get(media_url, timeout=20)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type"), path.rsplit("/", 1)[-1]

async def linkedin_upload_image(token, owner_urn, media_url):  # From server.py
    # [copy full function from server.py ~1100]
    pass  # Placeholder - copy exact

async def refresh_social_token(platform, account):  # From server.py
    # [copy full function from server.py ~1700]
    pass  # Placeholder - copy exact
