import asyncio
# Replace: from server import logger, db, publish_post
from common import logger, db
from server import publish_post  # Only this (no circle)

async def enqueue_publish(post_id: str):
    logger.info(f"Enqueuing post {post_id}")
    asyncio.create_task(publish_post(post_id))
# ...

