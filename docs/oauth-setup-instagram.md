# Instagram OAuth Setup Guide

## Prerequisites
- Instagram account converted to **Business or Creator** account
- Facebook Page linked to your Instagram account
- Meta Developer account

## Step 1: Create Meta App

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Click **Create App**
3. Select **Business** app type
4. Fill in app details:
   - App Name: "Schedora Social Manager"
   - Contact Email: your-email@example.com
5. Click **Create App**

## Step 2: Add Instagram Graph API Product

1. In your app dashboard, go to **Add Products**
2. Find **Instagram Graph API** and click **Set Up**
3. This will add Instagram API to your app

## Step 3: Configure OAuth Settings

1. Go to **App Settings** → **Basic**
2. Note your **App ID** and **App Secret** (keep these secure)
3. Add **Privacy Policy URL** (required for live mode)
4. Add **Terms of Service URL** (required)
5. In **App Domains**, add: `schedora.com` (your domain)

## Step 4: Configure OAuth Redirect URIs

1. Go to **Use Cases** → **Customize** → **Settings**
2. Add OAuth Redirect URIs:
   ```
   https://your-domain.com/auth/instagram/callback
   http://localhost:3000/auth/instagram/callback (for testing)
   ```

## Step 5: Request Permissions

1. Go to **App Review** → **Permissions and Features**
2. Request these permissions:
   - `instagram_basic` (Basic Profile Access)
   - `instagram_content_publish` (Publish Content)
   - `pages_read_engagement` (Read Page Engagement)
   - `instagram_manage_comments` (Manage Comments)
   - `instagram_manage_insights` (View Insights)

## Step 6: Test Mode Setup

1. Go to **Roles** → **Test Users**
2. Add Instagram test accounts
3. Or add yourself as a **Tester** in **Roles** → **Roles**

## Step 7: Get Instagram Business Account ID

1. Use Graph API Explorer: https://developers.facebook.com/tools/explorer/
2. Select your app
3. Request a User Access Token with permissions
4. Make a GET request:
   ```
   /{facebook-page-id}?fields=instagram_business_account
   ```
5. Note the Instagram Business Account ID

## Step 8: Implement OAuth Flow in Schedora

### Backend Implementation

Add to `/app/backend/.env`:
```bash
INSTAGRAM_APP_ID="your-app-id"
INSTAGRAM_APP_SECRET="your-app-secret"
INSTAGRAM_REDIRECT_URI="https://your-domain.com/auth/instagram/callback"
```

### Authorization URL
```python
import os
from urllib.parse import urlencode

def get_instagram_auth_url():
    params = {
        'client_id': os.environ['INSTAGRAM_APP_ID'],
        'redirect_uri': os.environ['INSTAGRAM_REDIRECT_URI'],
        'scope': 'instagram_basic,instagram_content_publish,instagram_manage_insights',
        'response_type': 'code'
    }
    return f"https://api.instagram.com/oauth/authorize?{urlencode(params)}"
```

### Exchange Code for Token
```python
import requests

def exchange_instagram_code(code):
    response = requests.post(
        'https://api.instagram.com/oauth/access_token',
        data={
            'client_id': os.environ['INSTAGRAM_APP_ID'],
            'client_secret': os.environ['INSTAGRAM_APP_SECRET'],
            'grant_type': 'authorization_code',
            'redirect_uri': os.environ['INSTAGRAM_REDIRECT_URI'],
            'code': code
        }
    )
    return response.json()  # Contains short-lived access_token
```

### Get Long-Lived Token (60 days)
```python
def get_long_lived_token(short_token):
    response = requests.get(
        'https://graph.instagram.com/access_token',
        params={
            'grant_type': 'ig_exchange_token',
            'client_secret': os.environ['INSTAGRAM_APP_SECRET'],
            'access_token': short_token
        }
    )
    return response.json()
```

## Step 9: Publishing Posts

### Create Container
```python
def create_instagram_post(ig_user_id, image_url, caption, access_token):
    # Step 1: Create media container
    response = requests.post(
        f'https://graph.facebook.com/v20.0/{ig_user_id}/media',
        params={
            'image_url': image_url,
            'caption': caption,
            'access_token': access_token
        }
    )
    container_id = response.json()['id']
    
    # Step 2: Publish container
    publish_response = requests.post(
        f'https://graph.facebook.com/v20.0/{ig_user_id}/media_publish',
        params={
            'creation_id': container_id,
            'access_token': access_token
        }
    )
    return publish_response.json()
```

## Step 10: Go Live

1. Complete **App Review** for required permissions
2. Switch app from **Development** to **Live** mode
3. Update your app's **Privacy Policy** and **Terms**
4. Test with real users

## Rate Limits

- **200 calls per hour** per user
- **25 posts per day** per user
- Monitor via response headers: `X-App-Usage`, `X-Business-Use-Case-Usage`

## Troubleshooting

### "Invalid OAuth Redirect URI"
- Verify redirect URI exactly matches in Meta app settings
- Check for trailing slashes

### "User not authorized"
- Ensure Instagram account is Business or Creator
- Link to Facebook Page
- Add account as Tester in app

### "Permission denied"
- Request permission in App Review
- Wait for approval (can take 1-2 weeks)

## Resources

- [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api)
- [Content Publishing Guide](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/reference)
