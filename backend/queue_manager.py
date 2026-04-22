from redis import Redis
from rq import Queue
import os
from datetime import timedelta

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
redis_conn = Redis.from_url(redis_url)

publish_queue = Queue('publish', connection=redis_conn)
retry_queue = Queue('retry', connection=redis_conn)

def enqueue_publish(post_id):
    publish_queue.enqueue(publish_worker, post_id)

def enqueue_retry(post_id, delay_seconds):
    retry_queue.enqueue_in(timedelta(seconds=delay_seconds), retry_worker, post_id)

async def publish_worker(post_id):
    from server import publish_post
    await publish_post(post_id)

async def retry_worker(post_id):
    from server import publish_post
    await publish_post(post_id)