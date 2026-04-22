import os
import requests
import logging
from abc import ABC, abstractmethod
from typing import Dict
# Replace: from server import linkedin_headers, fetch_media_binary, ...
from common import linkedin_headers, fetch_media_binary, linkedin_upload_image, refresh_social_token
# Remove other server imports
import time
from datetime import datetime, timezone


class PlatformAdapter(ABC):
    @abstractmethod
    async def validate_content(self, post: dict):
        pass

    @abstractmethod
    async def format_payload(self, post: dict):
        pass

    @abstractmethod
    async def publish(self, post: dict, account: dict):
        pass


class TwitterAdapter(PlatformAdapter):
    async def validate_content(self, post: dict):
        content = post.get('content', '')
        if len(content) > 280:
            raise ValueError("Content exceeds 280 characters")

    async def format_payload(self, post: dict):
        content = post.get('content', '')
        media = post.get('media', [])
        text = content
        if media:
            urls = [m.get('url') for m in media if m.get('url')]
            text += ' ' + ' '.join(urls)
        return {'text': text}

    async def publish(self, post: dict, account: dict):
        access_token = account.get('access_token') or os.environ.get('ACCESS_TOKEN')
        if not access_token:
            return {"status": "failed", "error": "No access token"}
        url = 'https://api.twitter.com/2/tweets'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        payload = await self.format_payload(post)
        try:
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code == 201:
                data = response.json()
                return {"status": "success", "platform_post_id": data['data']['id']}
            else:
                return {"status": "failed", "error": response.text}
        except Exception as e:
            logging.error(f"Error publishing to Twitter: {e}")
            return {"status": "failed", "error": str(e)}


class LinkedInAdapter(PlatformAdapter):
    async def validate_content(self, post: dict):
        content = post.get('content', '')
        if not isinstance(content, str):
            raise ValueError("Content must be a string")
        # LinkedIn allows long text, no specific limit

    async def format_payload(self, post: dict):
        content = post.get('content', '')
        media = post.get('media', [])
        payload = {
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
        if media:
            payload["content"] = {"media": {"id": "placeholder"}}  # Will be replaced in publish after upload
        return payload

    async def publish(self, post: dict, account: dict):
        token = account.get('access_token')
        author_id = account.get('platform_user_id')
        if not token or not author_id:
            return {"status": "failed", "error": "LinkedIn access token or user ID missing"}
        author_urn = f"urn:li:person:{author_id}"
        payload = await self.format_payload(post)
        media = post.get('media', [])
        if media:
            media_url = media[0].get('url')
            if media_url:
                try:
                    image_urn = await linkedin_upload_image(token, author_urn, media_url)
                    payload["content"] = {"media": {"id": image_urn}}
                except Exception as e:
                    logging.error(f"LinkedIn image upload failed: {e}")
                    return {"status": "failed", "error": f"Image upload failed: {str(e)}"}
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
            logging.error(f"LinkedIn publish failed: {resp.status_code} {error_body}")
            return {"status": "failed", "error": f"LinkedIn API error {resp.status_code}: {error_body}"}


class FacebookAdapter(PlatformAdapter):
    async def validate_content(self, post: dict):
        # Allow any length, no specific limit
        pass

    async def format_payload(self, post: dict):
        content = post.get('content', '')
        media = post.get('media', [])
        message = content
        if media:
            media_urls = [m.get('url') for m in media if m.get('url')]
            if media_urls:
                message += ' ' + ' '.join(media_urls)
        return {'message': message}

    async def publish(self, post: dict, account: dict):
        access_token = account.get('access_token')
        if not access_token:
            return {"status": "failed", "error": "No access token"}
        url = 'https://graph.facebook.com/v2.5/me/feed'
        payload = await self.format_payload(post)
        params = {'access_token': access_token}
        try:
            response = requests.post(url, data=payload, params=params, timeout=20)
            if response.status_code == 200:
                data = response.json()
                return {"status": "success", "platform_post_id": data.get('id')}
            elif response.status_code == 401:
                # Try to refresh token
                new_token = await refresh_social_token("facebook", account)
                if new_token:
                    params['access_token'] = new_token
                    response = requests.post(url, data=payload, params=params, timeout=15)
                    if response.status_code == 200:
                        data = response.json()
                        return {"status": "success", "platform_post_id": data.get('id')}
                    else:
                        return {"status": "failed", "error": f"Facebook API error after refresh: {response.text}"}
                else:
                    return {"status": "failed", "error": "Token refresh failed"}
            else:
                return {"status": "failed", "error": f"Facebook API error: {response.text}"}
        except Exception as e:
            logging.error(f"Error publishing to Facebook: {e}")
            return {"status": "failed", "error": str(e)}


class InstagramAdapter(PlatformAdapter):
    async def validate_content(self, post: dict):
        media = post.get('media', [])
        if not media or not any(m.get('url') for m in media):
            raise ValueError("Instagram requires media")

    async def format_payload(self, post: dict):
        content = post.get('content', '')
        media = post.get('media', [])
        media_urls = [m.get('url') for m in media if m.get('url')]
        return {'image_url': media_urls[0], 'caption': content}

    async def publish(self, post: dict, account: dict):
        access_token = account.get('access_token')
        ig_user_id = account.get('platform_user_id')
        if not access_token or not ig_user_id:
            return {"status": "failed", "error": "No access token or Instagram user ID"}
        payload = await self.format_payload(post)
        # Create media container
        media_url = f"https://graph.facebook.com/v18.0/{ig_user_id}/media"
        params = {'access_token': access_token}
        try:
            response = requests.post(media_url, data=payload, params=params, timeout=20)
            if response.status_code == 200:
                data = response.json()
                creation_id = data.get('id')
                if not creation_id:
                    return {"status": "failed", "error": "Failed to create media container"}
            elif response.status_code == 401:
                new_token = await refresh_social_token("instagram", account)
                if new_token:
                    params['access_token'] = new_token
                    response = requests.post(media_url, data=payload, params=params, timeout=15)
                    if response.status_code == 200:
                        data = response.json()
                        creation_id = data.get('id')
                        if not creation_id:
                            return {"status": "failed", "error": "Failed to create media container after refresh"}
                    else:
                        return {"status": "failed", "error": f"Instagram media creation failed after refresh: {response.text}"}
                else:
                    return {"status": "failed", "error": "Token refresh failed"}
            else:
                return {"status": "failed", "error": f"Instagram media creation failed: {response.text}"}
        except Exception as e:
            logging.error(f"Error creating Instagram media container: {e}")
            return {"status": "failed", "error": str(e)}

        # Publish media
        publish_url = f"https://graph.facebook.com/v18.0/{ig_user_id}/media_publish"
        publish_payload = {'creation_id': creation_id, 'access_token': access_token}
        try:
            response = requests.post(publish_url, data=publish_payload, timeout=20)
            if response.status_code == 200:
                data = response.json()
                platform_post_id = data.get('id')
                return {"status": "success", "platform_post_id": platform_post_id}
            elif response.status_code == 401:
                new_token = await refresh_social_token("instagram", account)
                if new_token:
                    publish_payload['access_token'] = new_token
                    response = requests.post(publish_url, data=publish_payload, timeout=15)
                    if response.status_code == 200:
                        data = response.json()
                        platform_post_id = data.get('id')
                        return {"status": "success", "platform_post_id": platform_post_id}
                    else:
                        return {"status": "failed", "error": f"Instagram publish failed after refresh: {response.text}"}
                else:
                    return {"status": "failed", "error": "Token refresh failed"}
            else:
                return {"status": "failed", "error": f"Instagram publish failed: {response.text}"}
        except Exception as e:
            logging.error(f"Error publishing to Instagram: {e}")
            return {"status": "failed", "error": str(e)}


class PinterestAdapter(PlatformAdapter):
    async def validate_content(self, post: dict):
        # Allow any length
        pass

    async def format_payload(self, post: dict):
        content = post.get('content', '')
        account = post.get('account', {})
        media = post.get('media', [])
        payload = {
            "title": content[:100],
            "description": content,
            "link": post.get('link'),
            "board_id": account.get('board_id')
        }
        if media:
            media_url = media[0].get('url')
            if media_url:
                payload["media_source"] = {"url": media_url, "is_standard": True}
        return payload

    async def publish(self, post: dict, account: dict):
        access_token = account.get('access_token')
        if not access_token:
            return {"status": "failed", "error": "No access token"}
        url = 'https://api.pinterest.com/v5/pins'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        payload = await self.format_payload(post)
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=20)
            if response.status_code == 201:
                data = response.json()
                return {"status": "success", "platform_post_id": data['id']}
            elif response.status_code == 401:
                new_token = await refresh_social_token("pinterest", account)
                if new_token:
                    headers['Authorization'] = f'Bearer {new_token}'
                    response = requests.post(url, json=payload, headers=headers, timeout=15)
                    if response.status_code == 201:
                        data = response.json()
                        return {"status": "success", "platform_post_id": data['id']}
                    else:
                        return {"status": "failed", "error": f"Pinterest API error after refresh: {response.text}"}
                else:
                    return {"status": "failed", "error": "Token refresh failed"}
            else:
                return {"status": "failed", "error": f"Pinterest API error: {response.text}"}
        except Exception as e:
            logging.error(f"Error publishing to Pinterest: {e}")
            return {"status": "failed", "error": str(e)}


class RedditAdapter(PlatformAdapter):
    async def validate_content(self, post: dict):
        # Allow any length
        pass

    async def format_payload(self, post: dict):
        content = post.get('content', '')
        link = post.get('link')
        target_accounts = post.get('target_accounts', {})
        reddit_subs = target_accounts.get('reddit', [])
        if not reddit_subs:
            raise ValueError("No Reddit subreddit specified in target_accounts")
        sr = reddit_subs[0]
        payload = {
            'sr': sr,
            'title': content[:300]
        }
        if link:
            payload['url'] = link
            payload['kind'] = 'link'
        else:
            payload['selftext'] = content
            payload['kind'] = 'self'
        return payload

    async def publish(self, post: dict, account: dict):
        access_token = account.get('access_token')
        if not access_token:
            return {"status": "failed", "error": "No access token"}
        url = 'https://oauth.reddit.com/api/submit'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'User-Agent': 'Schedora/1.0'
        }
        payload = await self.format_payload(post)
        try:
            response = requests.post(url, data=payload, headers=headers, timeout=20)
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return {"status": "success", "platform_post_id": data['jquery'][10][3][0]}
                else:
                    return {"status": "failed", "error": data.get('jquery', [None, None, None, None, None, None, None, None, None, None, None, 'Unknown error'])[10]}
            elif response.status_code == 401:
                new_token = await refresh_social_token("reddit", account)
                if new_token:
                    headers['Authorization'] = f'Bearer {new_token}'
                    response = requests.post(url, data=payload, headers=headers, timeout=15)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('success'):
                            return {"status": "success", "platform_post_id": data['jquery'][10][3][0]}
                        else:
                            return {"status": "failed", "error": data.get('jquery', [None, None, None, None, None, None, None, None, None, None, None, 'Unknown error'])[10]}
                    else:
                        return {"status": "failed", "error": f"Reddit API error after refresh: {response.text}"}
                else:
                    return {"status": "failed", "error": "Token refresh failed"}
            else:
                return {"status": "failed", "error": f"Reddit API error: {response.text}"}
        except Exception as e:
            logging.error(f"Error publishing to Reddit: {e}")
            return {"status": "failed", "error": str(e)}


class LinkedInJobAdapter(PlatformAdapter):
    LINKEDIN_JOB_CLIENT_ID = os.environ.get('LINKEDIN_JOB_CLIENT_ID')
    LINKEDIN_JOB_CLIENT_SECRET = os.environ.get('LINKEDIN_JOB_CLIENT_SECRET')
    LINKEDIN_API_VERSION = os.environ.get("LINKEDIN_API_VERSION", "202411")

    async def validate_content(self, job: dict):
        required = ['title', 'company', 'location', 'description']
        missing = [f for f in required if not job.get(f) or not str(job.get(f)).strip()]
        if missing:
            raise ValueError(f"Missing required job fields: {', '.join(missing)}")

    async def get_client_token(self):
        if not self.LINKEDIN_JOB_CLIENT_ID or not self.LINKEDIN_JOB_CLIENT_SECRET:
            raise ValueError("LINKEDIN_JOB_CLIENT_ID/SECRET not configured")
        
        resp = requests.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            data={
                'grant_type': 'client_credentials',
                'client_id': self.LINKEDIN_JOB_CLIENT_ID,
                'client_secret': self.LINKEDIN_JOB_CLIENT_SECRET,
            },
            timeout=10
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Client credentials failed: {resp.text}")
        return resp.json()['access_token']

    async def format_payload(self, job: dict):
        return {
            "title": job['title'],
            "description": job['description'],
            "company": job['company'],
            "location": job.get('location', 'Remote'),
            "employmentType": job.get('job_type', 'FULL_TIME').upper(),
            "salary": {
                "currency": "USD",
                "minValue": job.get('salary'),
                "maxValue": job.get('salary'),
            } if job.get('salary') else None,
            "skillsAndExperience": [
                {"name": skill} for skill in (job.get('requirements') or [])
            ] if job.get('requirements') else [],
            "primaryLanguage": {"localized": {"locale": "en_US", "name": "English"}},
        }

    async def publish(self, job: dict, account: dict = None):
        """Submit job posting - returns taskId for async processing"""
        await self.validate_content(job)
        
        token = await self.get_client_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Linkedin-Version': self.LINKEDIN_API_VERSION,
        }
        
        payload = await self.format_payload(job)
        
        resp = requests.post(
            'https://api.linkedin.com/rest/simpleJobPostings',
            json=payload,
            headers=headers,
            timeout=30
        )
        
        if resp.status_code not in [200, 201, 202]:
            try:
                error = resp.json()
            except:
                error = resp.text
            logging.error(f"Job posting failed: {resp.status_code} {error}")
            return {"status": "failed", "error": f"API error {resp.status_code}: {error}"}
        
        result = resp.json()
        task_id = result.get('taskId')
        if not task_id:
            return {"status": "failed", "error": "No taskId returned"}
        
        return {"status": "submitted", "task_id": task_id}

    async def poll_task_status(self, task_id: str, timeout: int = 300, poll_interval: int = 10):
        """Poll job posting task until COMPLETE/FAILED"""
        token = await self.get_client_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Linkedin-Version': self.LINKEDIN_API_VERSION,
        }
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            resp = requests.get(
                f'https://api.linkedin.com/rest/simpleJobPostings/taskStatus/{task_id}',
                headers=headers,
                timeout=15
            )
            
            if resp.status_code != 200:
                return "failed"
            
            status_data = resp.json()
            status = status_data.get('status')
            
            if status in ['COMPLETED', 'PUBLISHED']:
                return "success"
            elif status in ['FAILED', 'REJECTED', 'CANCELLED']:
                error = status_data.get('errorMessage', 'Unknown error')
                logging.error(f"Job task {task_id} failed: {error}")
                return "failed"
            
            await asyncio.sleep(poll_interval)
        
        logging.warning(f"Job task {task_id} timeout after {timeout}s")
        return "timeout"


ADAPTERS = {
    "twitter": TwitterAdapter,
    "linkedin": LinkedInAdapter,
    "facebook": FacebookAdapter,
    "instagram": InstagramAdapter,
    "pinterest": PinterestAdapter,
    "reddit": RedditAdapter,
    "linkedin_job": LinkedInJobAdapter,
}

