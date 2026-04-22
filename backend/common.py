# backend/common.py - Shared globals
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB (duplicate from server.py - extract here)
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'schedoradb')]

# LinkedIn helpers (extract from server.py)
LINKEDIN_API_VERSION = os.environ.get("LINKEDIN_API_VERSION", "202603")
def linkedin_headers(token: str, include_content_type: bool = True, include_version: bool = True) -> dict:
    headers = {"Authorization": f"Bearer {token}", "X-Restli-Protocol-Version": "2.0.0"}
    if include_version: headers["Linkedin-Version"] = LINKEDIN_API_VERSION
    if include_content_type: headers["Content-Type"] = "application/json"
    return headers

# Other helpers: fetch_media_binary, linkedin_upload_image, refresh_social_token
# (Copy exact functions from server.py line ~300-500)
