# LinkedIn OAuth Setup Guide

## Prerequisites
- LinkedIn Page (Company/Organization)
- LinkedIn Developer account
- Verified domain

## Step 1: Create LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click **Create app**
3. Fill in app details:
   - App name: "Schedora"
   - LinkedIn Page: Select your company page
   - Privacy policy URL: `https://your-domain.com/privacy`
   - App logo: Upload 300x300px logo
4. Agree to terms and click **Create app**

## Step 2: Get API Credentials

1. Go to **Auth** tab
2. Note your:
   - **Client ID**
   - **Client Secret** (keep secure)

## Step 3: Configure OAuth 2.0 Settings

1. In **Auth** tab, scroll to **OAuth 2.0 settings**
2. Add **Redirect URLs**:
   ```
   https://your-domain.com/auth/linkedin/callback
   http://localhost:3000/auth/linkedin/callback
   ```
3. Save changes

## Step 4: Request API Access

1. Go to **Products** tab
2. Request access to:
   - **Share on LinkedIn** (required for posting)
   - **Sign In with LinkedIn using OpenID Connect** (for auth)
   - **Marketing Developer Platform** (for company pages)
3. Wait for approval (instant for Sign In, review needed for others)

## Step 5: Verify Your Domain

1. Go to **Settings** tab
2. Under **Domain**, click **Add domain**
3. Enter your domain: `your-domain.com`
4. Follow verification steps:
   - Add DNS TXT record, or
   - Upload verification file to website
5. Click **Verify**

## Step 6: Implement OAuth Flow

### Backend Setup

Add to `/app/backend/.env`:
```bash
LINKEDIN_CLIENT_ID="your-client-id"
LINKEDIN_CLIENT_SECRET="your-client-secret"
LINKEDIN_REDIRECT_URI="https://your-domain.com/auth/linkedin/callback"
```

### Authorization URL
```python
import os
from urllib.parse import urlencode
import secrets

def get_linkedin_auth_url():
    state = secrets.token_urlsafe(16)
    params = {
        'response_type': 'code',
        'client_id': os.environ['LINKEDIN_CLIENT_ID'],
        'redirect_uri': os.environ['LINKEDIN_REDIRECT_URI'],
        'scope': 'openid profile email w_member_social w_organization_social r_organization_social',
        'state': state
    }
    return f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}", state
```

### Exchange Code for Token
```python
import requests

def exchange_linkedin_code(code):
    response = requests.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'client_id': os.environ['LINKEDIN_CLIENT_ID'],
            'client_secret': os.environ['LINKEDIN_CLIENT_SECRET'],
            'redirect_uri': os.environ['LINKEDIN_REDIRECT_URI']
        }
    )
    return response.json()  # Contains access_token, expires_in (60 days)
```

### Get User Profile
```python
def get_linkedin_profile(access_token):
    response = requests.get(
        'https://api.linkedin.com/v2/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    return response.json()
```

### Get Organization/Company Pages
```python
def get_organization_access(access_token):
    response = requests.get(
        'https://api.linkedin.com/v2/organizationAcls',
        params={'q': 'roleAssignee'},
        headers={'Authorization': f'Bearer {access_token}'}
    )
    return response.json()['elements']
```

## Step 7: Publishing Posts

### Personal Post (Share)
```python
def post_to_personal(access_token, text, visibility='PUBLIC'):
    # Get user ID
    profile = get_linkedin_profile(access_token)
    author_id = profile['sub']
    
    response = requests.post(
        'https://api.linkedin.com/v2/ugcPosts',
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        json={
            'author': f'urn:li:person:{author_id}',
            'lifecycleState': 'PUBLISHED',
            'specificContent': {
                'com.linkedin.ugc.ShareContent': {
                    'shareCommentary': {'text': text},
                    'shareMediaCategory': 'NONE'
                }
            },
            'visibility': {'com.linkedin.ugc.MemberNetworkVisibility': visibility}
        }
    )
    return response.json()
```

### Organization/Company Post
```python
def post_to_organization(access_token, org_id, text):
    response = requests.post(
        'https://api.linkedin.com/v2/ugcPosts',
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        json={
            'author': f'urn:li:organization:{org_id}',
            'lifecycleState': 'PUBLISHED',
            'specificContent': {
                'com.linkedin.ugc.ShareContent': {
                    'shareCommentary': {'text': text},
                    'shareMediaCategory': 'NONE'
                }
            },
            'visibility': {'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'}
        }
    )
    return response.json()
```

### Post with Image
```python
def upload_image(access_token, author_urn, image_data):
    # Step 1: Register upload
    register_response = requests.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        },
        json={
            'registerUploadRequest': {
                'recipes': ['urn:li:digitalmediaRecipe:feedshare-image'],
                'owner': author_urn,
                'serviceRelationships': [{
                    'relationshipType': 'OWNER',
                    'identifier': 'urn:li:userGeneratedContent'
                }]
            }
        }
    )
    upload_url = register_response.json()['value']['uploadMechanism']['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']['uploadUrl']
    asset_urn = register_response.json()['value']['asset']
    
    # Step 2: Upload binary data
    requests.put(
        upload_url,
        headers={'Authorization': f'Bearer {access_token}'},
        data=image_data
    )
    
    return asset_urn

def post_with_image(access_token, author_urn, text, image_data):
    asset_urn = upload_image(access_token, author_urn, image_data)
    
    response = requests.post(
        'https://api.linkedin.com/v2/ugcPosts',
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        json={
            'author': author_urn,
            'lifecycleState': 'PUBLISHED',
            'specificContent': {
                'com.linkedin.ugc.ShareContent': {
                    'shareCommentary': {'text': text},
                    'shareMediaCategory': 'IMAGE',
                    'media': [{
                        'status': 'READY',
                        'media': asset_urn
                    }]
                }
            },
            'visibility': {'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'}
        }
    )
    return response.json()
```

## Step 8: Get Post Analytics

```python
def get_post_stats(access_token, post_urn):
    # Extract share ID from URN
    share_id = post_urn.split(':')[-1]
    
    response = requests.get(
        f'https://api.linkedin.com/v2/socialMetadata/{post_urn}/statistics',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    return response.json()

def get_organization_analytics(access_token, org_id, start_date, end_date):
    response = requests.get(
        'https://api.linkedin.com/v2/organizationalEntityShareStatistics',
        params={
            'q': 'organizationalEntity',
            'organizationalEntity': f'urn:li:organization:{org_id}',
            'timeIntervals.timeGranularityType': 'DAY',
            'timeIntervals.timeRange.start': start_date,  # milliseconds since epoch
            'timeIntervals.timeRange.end': end_date
        },
        headers={'Authorization': f'Bearer {access_token}'}
    )
    return response.json()
```

## Rate Limits

### API Throttling (per app)
- **100,000 calls per day** per application
- **500 calls per user per day**
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Post Limits
- **25 posts per person per day**
- **25 posts per organization per day**
- No limit on comments/reactions

## Character Limits

- **Post text**: 3000 characters max
- **Comment**: 1250 characters
- **Hashtags**: Up to 3 recommended, 30 max

## Webhooks (Event Notifications)

**Note**: Currently in limited beta.

### Subscribe to Events
```python
def subscribe_to_webhooks(access_token, webhook_url):
    response = requests.post(
        'https://api.linkedin.com/v2/webhooks',
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        },
        json={
            'url': webhook_url,
            'events': ['SHARE_CREATED', 'SHARE_UPDATED', 'COMMENT_CREATED']
        }
    )
    return response.json()
```

## Troubleshooting

### "Access Denied"
- App not approved for required products
- Missing scope in authorization request

### "Invalid redirect_uri"
- URI must exactly match registered URL
- Check for http vs https, trailing slashes

### "Insufficient permissions"
- User doesn't have admin access to organization
- Request proper scopes: `w_organization_social`

### "Token expired"
- Tokens expire after 60 days
- Implement token refresh or re-authorization

## Best Practices

1. **Use organization posts for company pages** - better reach
2. **Tag companies/users** with URNs: `urn:li:organization:{id}`
3. **Add hashtags** to increase discoverability
4. **Monitor analytics** to optimize posting times
5. **Respect rate limits** - implement queuing

## Resources

- [LinkedIn API Documentation](https://learn.microsoft.com/en-us/linkedin/)
- [Share on LinkedIn](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin)
- [Marketing API](https://learn.microsoft.com/en-us/linkedin/marketing/)
- [Best Practices](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/best-practices)
