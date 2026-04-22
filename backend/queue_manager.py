import asyncio
# Replace: from server import logger, db, publish_post
from server import app
import asyncio
from common import logger, db

async def enqueue_publish(post_id: str):
    logger.info(f"Enqueuing post {post_id}")
    # Call directly (avoid import)
    asyncio.create_task(app.state.scheduler.add_job('server.publish_post', args=[post_id]))

async def enqueue_retry(post_id: str, delay_seconds: int):
    logger.info(f"Retry {post_id} in {delay_seconds}s")
    await asyncio.sleep(delay_seconds)
    asyncio.create_task(app.state.scheduler.add_job('server.publish_post', args=[post_id]))
