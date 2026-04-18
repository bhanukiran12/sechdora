# Twitter (X) OAuth 2.0 Setup Guide

## Prerequisites
- Twitter Developer Account
- Approved Twitter App
- Elevated Access (for posting)

## Step 1: Apply for Developer Account

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Click **Sign up** or **Apply**
3. Select **Professional** or **Hobbyist** use case
4. Answer questions about your intended use
5. Agree to Terms and submit application
6. Wait for approval (usually instant to 24 hours)

## Step 2: Create Twitter App

1. Go to [Developer Portal Dashboard](https://developer.twitter.com/en/portal/dashboard)
2. Click **+ Create Project**
3. Fill in project details:
   - Project Name: "Schedora Social Manager"
   - Use Case: Content publishing and scheduling
4. Create app within project:
   - App Name: "Schedora" (must be unique globally)
   - Environment: Production

## Step 3: Apply for Elevated Access

1. In your project, click **Elevated** tab
2. Click **Apply for Elevated**
3. Fill out additional information:
   - Describe how you'll use Twitter API
   - Explain need for write access (posting)
   - Estimate API usage volume
4. Submit and wait for approval (1-2 days)

## Step 4: App Settings

1. Go to your app's **Settings** tab
2. Enable **OAuth 2.0**
3. Set **Type of App**: Web App
4. Add **Callback URI / Redirect URL**:
   ```
   https://your-domain.com/auth/twitter/callback
   http://localhost:3000/auth/twitter/callback
   ```
5. Add **Website URL**: `https://your-domain.com`

## Step 5: Get API Credentials

1. Go to **Keys and Tokens** tab
2. Note your:
   - **API Key** (Client ID)
   - **API Key Secret** (Client Secret)
3. Generate **Bearer Token** (for app-only auth)
4. Generate **Access Token & Secret** (for user auth)

## Step 6: OAuth 2.0 PKCE Flow (Recommended)

Twitter recommends OAuth 2.0 with PKCE for security.

### Backend Setup

Add to `/app/backend/.env`:
```bash
TWITTER_CLIENT_ID="your-client-id"
TWITTER_CLIENT_SECRET="your-client-secret"
TWITTER_REDIRECT_URI="https://your-domain.com/auth/twitter/callback"
```

### Generate PKCE Challenge
```python
import secrets
import hashlib
import base64

def generate_pkce_pair():
    # Code verifier: random 43-128 char string
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
    
    # Code challenge: SHA256 hash of verifier
    challenge = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    code_challenge = base64.urlsafe_b64encode(challenge).decode('utf-8').rstrip('=')
    
    return code_verifier, code_challenge
```

### Authorization URL
```python
import os
from urllib.parse import urlencode

def get_twitter_auth_url(code_challenge, state):
    params = {
        'response_type': 'code',
        'client_id': os.environ['TWITTER_CLIENT_ID'],
        'redirect_uri': os.environ['TWITTER_REDIRECT_URI'],
        'scope': 'tweet.read tweet.write users.read offline.access',
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256'
    }
    return f"https://twitter.com/i/oauth2/authorize?{urlencode(params)}"
```

### Exchange Code for Token
```python
import requests
import base64

def exchange_twitter_code(code, code_verifier):
    # Create Basic Auth header
    credentials = f"{os.environ['TWITTER_CLIENT_ID']}:{os.environ['TWITTER_CLIENT_SECRET']}"
    b64_credentials = base64.b64encode(credentials.encode()).decode()
    
    response = requests.post(
        'https://api.twitter.com/2/oauth2/token',
        headers={
            'Authorization': f'Basic {b64_credentials}',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data={
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': os.environ['TWITTER_REDIRECT_URI'],
            'code_verifier': code_verifier
        }
    )
    return response.json()  # Contains access_token, refresh_token
```

### Refresh Token
```python
def refresh_twitter_token(refresh_token):
    credentials = f"{os.environ['TWITTER_CLIENT_ID']}:{os.environ['TWITTER_CLIENT_SECRET']}"
    b64_credentials = base64.b64encode(credentials.encode()).decode()
    
    response = requests.post(
        'https://api.twitter.com/2/oauth2/token',
        headers={
            'Authorization': f'Basic {b64_credentials}',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data={
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        }
    )
    return response.json()
```

## Step 7: Publishing Tweets

### Text Tweet
```python
def post_tweet(access_token, text):
    response = requests.post(
        'https://api.twitter.com/2/tweets',
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        },
        json={'text': text}
    )
    return response.json()
```

### Tweet with Media
```python
import os

def upload_media(access_token, media_data, media_type):
    # Step 1: Upload media (v1.1 API)
    response = requests.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        headers={'Authorization': f'Bearer {access_token}'},
        files={'media': media_data}
    )
    return response.json()['media_id_string']

def post_tweet_with_media(access_token, text, media_ids):
    response = requests.post(
        'https://api.twitter.com/2/tweets',
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        },
        json={
            'text': text,
            'media': {'media_ids': media_ids}
        }
    )
    return response.json()
```

### Thread (Multiple Tweets)
```python
def post_thread(access_token, tweets):
    tweet_ids = []
    reply_to_id = None
    
    for text in tweets:
        payload = {'text': text}
        if reply_to_id:
            payload['reply'] = {'in_reply_to_tweet_id': reply_to_id}
        
        response = requests.post(
            'https://api.twitter.com/2/tweets',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            },
            json=payload
        )
        tweet_id = response.json()['data']['id']
        tweet_ids.append(tweet_id)
        reply_to_id = tweet_id
    
    return tweet_ids
```

## Step 8: Get Tweet Analytics

```python
def get_tweet_metrics(access_token, tweet_id):
    response = requests.get(
        f'https://api.twitter.com/2/tweets/{tweet_id}',
        headers={'Authorization': f'Bearer {access_token}'},
        params={
            'tweet.fields': 'public_metrics,created_at',
            'expansions': 'author_id'
        }
    )
    data = response.json()['data']
    metrics = data['public_metrics']
    return {
        'retweets': metrics['retweet_count'],
        'likes': metrics['like_count'],
        'replies': metrics['reply_count'],
        'impressions': metrics.get('impression_count', 0)
    }
```

## Step 9: Webhooks (Account Activity API)

**Note**: Requires Enterprise or Premium account.

### Register Webhook
```python
def register_webhook(webhook_url):
    response = requests.post(
        'https://api.twitter.com/1.1/account_activity/all/:env_name/webhooks.json',
        headers={'Authorization': f'Bearer {bearer_token}'},
        params={'url': webhook_url}
    )
    return response.json()
```

## Rate Limits

### App-Level (per 15 minutes)
- Tweet creation: 300 requests
- Tweet deletion: 50 requests
- User lookup: 300 requests
- Media upload: 50 requests

### User-Level (per 24 hours)
- Tweets: 2400 posts
- Retweets: 2400
- Likes: Unlimited

## Character Limits

- Standard tweet: 280 characters
- Twitter Blue: 4000 characters (if user has subscription)
- URLs count as 23 characters

## Troubleshooting

### "Invalid redirect_uri"
- Exact match required (including https/http)
- Must be registered in app settings

### "Insufficient authentication scopes"
- Request correct scopes in authorization URL
- Re-authorize user if scopes changed

### "Forbidden: User has been suspended"
- Twitter account suspended or restricted
- Contact Twitter support

### "Rate limit exceeded"
- Wait for rate limit window to reset
- Implement exponential backoff
- Consider upgrading to higher tier

## Best Practices

1. **Store refresh tokens securely** - they're long-lived
2. **Implement token refresh** before expiry (2 hours)
3. **Handle rate limits gracefully** - use `x-rate-limit-*` headers
4. **Validate webhook payloads** with HMAC-SHA256
5. **Follow automation rules** - no spam, bot disclosure

## Resources

- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [OAuth 2.0 Guide](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Tweet Publishing](https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/introduction)
- [Rate Limits](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
