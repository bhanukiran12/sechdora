import asyncio
from server import logger, db, publish_post

async def enqueue_publish(post_id: str):
    """Enqueue post for publishing."""
    logger.info(f"Enqueuing post {post_id} for publish")
    asyncio.create_task(publish_post(post_id))

async def enqueue_retry(post_id: str, delay_seconds: int):
    """Enqueue post retry with delay."""
    logger.info(f"Scheduling retry for post {post_id} in {delay_seconds}s")
    await asyncio.sleep(delay_seconds)
    asyncio.create_task(publish_post(post_id))

