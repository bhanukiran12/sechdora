# Facebook OAuth Setup Guide

## Prerequisites
- Facebook Page for your business/brand
- Meta Developer account
- Valid website domain

## Step 1: Create Meta App

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** app type
4. Fill in:
   - App Name: "Schedora"
   - Contact Email: your-email@example.com
5. Click **Create App**

## Step 2: Add Facebook Login Product

1. In app dashboard, go to **Add Products**
2. Find **Facebook Login** and click **Set Up**
3. Select **Web** platform
4. Enter your Site URL: `https://your-domain.com`

## Step 3: Configure OAuth Settings

1. Go to **Facebook Login** → **Settings**
2. Add **Valid OAuth Redirect URIs**:
   ```
   https://your-domain.com/auth/facebook/callback
   http://localhost:3000/auth/facebook/callback
   ```
3. Enable **Login with the JavaScript SDK**
4. Enable **Web OAuth Login**

## Step 4: Basic App Settings

1. Go to **Settings** → **Basic**
2. Note **App ID** and **App Secret**
3. Add **Privacy Policy URL** (required)
4. Add **Terms of Service URL** (required)
5. Add **App Domains**: `your-domain.com`
6. Set **Category**: Social Media

## Step 5: Request Page Permissions

Go to **App Review** → **Permissions and Features** and request:

### Required Permissions:
- `pages_manage_posts` - Publish and manage posts
- `pages_read_engagement` - Read engagement metrics
- `pages_show_list` - List Pages user manages
- `publish_to_groups` - Post to Groups (if needed)

### Optional Permissions:
- `pages_manage_metadata` - Update Page info
- `pages_read_user_content` - Read user content on Page
- `pages_manage_engagement` - Manage comments/messages

## Step 6: Add Test Users

1. Go to **Roles** → **Test Users**
2. Create test Facebook accounts
3. Or add yourself in **Roles** → **Administrators**

## Step 7: Implement OAuth Flow

### Backend Setup

Add to `/app/backend/.env`:
```bash
FACEBOOK_APP_ID="your-app-id"
FACEBOOK_APP_SECRET="your-app-secret"
FACEBOOK_REDIRECT_URI="https://your-domain.com/auth/facebook/callback"
```

### Authorization URL
```python
import os
from urllib.parse import urlencode

def get_facebook_auth_url():
    params = {
        'client_id': os.environ['FACEBOOK_APP_ID'],
        'redirect_uri': os.environ['FACEBOOK_REDIRECT_URI'],
        'scope': 'pages_manage_posts,pages_read_engagement,pages_show_list',
        'response_type': 'code',
        'state': generate_random_state()  # CSRF protection
    }
    return f"https://www.facebook.com/v20.0/dialog/oauth?{urlencode(params)}"
```

### Exchange Code for Token
```python
import requests

def exchange_facebook_code(code):
    response = requests.get(
        'https://graph.facebook.com/v20.0/oauth/access_token',
        params={
            'client_id': os.environ['FACEBOOK_APP_ID'],
            'client_secret': os.environ['FACEBOOK_APP_SECRET'],
            'redirect_uri': os.environ['FACEBOOK_REDIRECT_URI'],
            'code': code
        }
    )
    return response.json()  # Contains short-lived access_token
```

### Get Long-Lived Token (60 days)
```python
def get_long_lived_token(short_token):
    response = requests.get(
        'https://graph.facebook.com/v20.0/oauth/access_token',
        params={
            'grant_type': 'fb_exchange_token',
            'client_id': os.environ['FACEBOOK_APP_ID'],
            'client_secret': os.environ['FACEBOOK_APP_SECRET'],
            'fb_exchange_token': short_token
        }
    )
    return response.json()
```

### Get User Pages
```python
def get_user_pages(access_token):
    response = requests.get(
        'https://graph.facebook.com/v20.0/me/accounts',
        params={'access_token': access_token}
    )
    return response.json()['data']
```

### Get Page Access Token (Never Expires)
```python
def get_page_token(page_id, user_token):
    response = requests.get(
        f'https://graph.facebook.com/v20.0/{page_id}',
        params={
            'fields': 'access_token',
            'access_token': user_token
        }
    )
    return response.json()['access_token']
```

## Step 8: Publishing Posts

### Text + Link Post
```python
def publish_facebook_post(page_id, page_token, message, link=None):
    data = {'message': message, 'access_token': page_token}
    if link:
        data['link'] = link
    
    response = requests.post(
        f'https://graph.facebook.com/v20.0/{page_id}/feed',
        data=data
    )
    return response.json()
```

### Photo Post
```python
def publish_photo_post(page_id, page_token, image_url, caption):
    response = requests.post(
        f'https://graph.facebook.com/v20.0/{page_id}/photos',
        data={
            'url': image_url,
            'caption': caption,
            'access_token': page_token
        }
    )
    return response.json()
```

### Video Post
```python
def publish_video_post(page_id, page_token, video_url, description):
    response = requests.post(
        f'https://graph.facebook.com/v20.0/{page_id}/videos',
        data={
            'file_url': video_url,
            'description': description,
            'access_token': page_token
        }
    )
    return response.json()
```

## Step 9: Get Post Analytics

```python
def get_post_insights(post_id, page_token):
    response = requests.get(
        f'https://graph.facebook.com/v20.0/{post_id}/insights',
        params={
            'metric': 'post_impressions,post_engaged_users,post_clicks',
            'access_token': page_token
        }
    )
    return response.json()['data']
```

## Step 10: App Review & Go Live

1. Complete all required fields in **Settings** → **Basic**
2. Submit for **App Review**:
   - Provide detailed use case
   - Record a screen recording demonstrating OAuth flow
   - Show how each permission is used
3. Wait for approval (typically 3-7 business days)
4. Switch to **Live** mode in app dashboard

## Rate Limits (v20.0)

- **Default**: 200 calls per hour per user
- **Page Publishing**: 100 posts per day per Page
- **Video Upload**: 1500 videos per day per Page
- Monitor via response headers

## Webhooks (Real-Time Updates)

### Subscribe to Page Events
```python
def subscribe_page_webhooks(page_id, page_token, callback_url):
    response = requests.post(
        f'https://graph.facebook.com/v20.0/{page_id}/subscribed_apps',
        data={
            'subscribed_fields': 'feed,comments,reactions',
            'access_token': page_token,
            'callback_url': callback_url,
            'verify_token': 'your-verify-token'
        }
    )
    return response.json()
```

## Troubleshooting

### "Invalid Redirect URI"
- Verify exact match in app settings (including https/http)
- No trailing slashes

### "User hasn't authorized app"
- App still in Development mode
- Add user as Tester or Admin

### "Permission denied for pages_manage_posts"
- Permission not approved in App Review
- Or user doesn't manage any Pages

### "Token expired"
- Exchange for long-lived token
- Page tokens don't expire if Page is active

## Resources

- [Facebook Login Docs](https://developers.facebook.com/docs/facebook-login/)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api)
- [Page Publishing Guide](https://developers.facebook.com/docs/pages/publishing)
- [Webhooks Documentation](https://developers.facebook.com/docs/graph-api/webhooks)
