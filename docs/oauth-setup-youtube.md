# YouTube OAuth Setup Guide

## Prerequisites
- YouTube channel
- Google Cloud Project
- YouTube Data API access

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: "Schedora YouTube Integration"
4. Click **Create**

## Step 2: Enable YouTube Data API

1. In your project, go to **APIs & Services** → **Library**
2. Search for **YouTube Data API v3**
3. Click on it and press **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if Google Workspace)
3. Fill in app information:
   - App name: "Schedora"
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
4. Add **Authorized domains**: `your-domain.com`
5. Click **Save and Continue**

### Add Scopes
1. Click **Add or Remove Scopes**
2. Select:
   - `https://www.googleapis.com/auth/youtube.upload` (Upload videos)
   - `https://www.googleapis.com/auth/youtube.force-ssl` (Manage channel)
   - `https://www.googleapis.com/auth/userinfo.profile` (User profile)
3. Click **Update** and **Save and Continue**

### Add Test Users (Development Mode)
1. Add test Gmail accounts
2. These users can test while app is in development

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Configure:
   - Name: "Schedora Web Client"
   - Authorized JavaScript origins:
     ```
     https://your-domain.com
     http://localhost:3000
     ```
   - Authorized redirect URIs:
     ```
     https://your-domain.com/auth/youtube/callback
     http://localhost:3000/auth/youtube/callback
     ```
5. Click **Create**
6. Note your **Client ID** and **Client Secret**

## Step 5: Backend Implementation

Add to `/app/backend/.env`:
```bash
YOUTUBE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
YOUTUBE_CLIENT_SECRET="your-client-secret"
YOUTUBE_REDIRECT_URI="https://your-domain.com/auth/youtube/callback"
```

Install Google API client:
```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### Authorization URL
```python
import os
from google_auth_oauthlib.flow import Flow

def get_youtube_auth_url():
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.environ['YOUTUBE_CLIENT_ID'],
                "client_secret": os.environ['YOUTUBE_CLIENT_SECRET'],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [os.environ['YOUTUBE_REDIRECT_URI']]
            }
        },
        scopes=[
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.force-ssl'
        ]
    )
    flow.redirect_uri = os.environ['YOUTUBE_REDIRECT_URI']
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    return authorization_url, state
```

### Exchange Code for Tokens
```python
def exchange_youtube_code(code, state):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.environ['YOUTUBE_CLIENT_ID'],
                "client_secret": os.environ['YOUTUBE_CLIENT_SECRET'],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [os.environ['YOUTUBE_REDIRECT_URI']]
            }
        },
        scopes=['https://www.googleapis.com/auth/youtube.upload'],
        state=state
    )
    flow.redirect_uri = os.environ['YOUTUBE_REDIRECT_URI']
    flow.fetch_token(code=code)
    
    credentials = flow.credentials
    return {
        'access_token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'expiry': credentials.expiry.isoformat() if credentials.expiry else None
    }
```

### Refresh Token
```python
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

def refresh_youtube_token(refresh_token):
    credentials = Credentials(
        None,
        refresh_token=refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.environ['YOUTUBE_CLIENT_ID'],
        client_secret=os.environ['YOUTUBE_CLIENT_SECRET']
    )
    credentials.refresh(Request())
    
    return {
        'access_token': credentials.token,
        'expiry': credentials.expiry.isoformat()
    }
```

## Step 6: Upload Video

```python
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials

def upload_video(access_token, video_file, title, description, tags=None, privacy='private'):
    credentials = Credentials(token=access_token)
    youtube = build('youtube', 'v3', credentials=credentials)
    
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags or [],
            'categoryId': '22'  # People & Blogs
        },
        'status': {
            'privacyStatus': privacy,  # 'private', 'unlisted', or 'public'
            'selfDeclaredMadeForKids': False
        }
    }
    
    media = MediaFileUpload(video_file, chunksize=-1, resumable=True)
    
    request = youtube.videos().insert(
        part='snippet,status',
        body=body,
        media_body=media
    )
    
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Upload {int(status.progress() * 100)}% complete")
    
    return response
```

## Step 7: Update Video Metadata

```python
def update_video(access_token, video_id, title=None, description=None):
    credentials = Credentials(token=access_token)
    youtube = build('youtube', 'v3', credentials=credentials)
    
    # Get current video details
    video_response = youtube.videos().list(
        id=video_id,
        part='snippet'
    ).execute()
    
    video = video_response['items'][0]
    snippet = video['snippet']
    
    if title:
        snippet['title'] = title
    if description:
        snippet['description'] = description
    
    update_response = youtube.videos().update(
        part='snippet',
        body={
            'id': video_id,
            'snippet': snippet
        }
    ).execute()
    
    return update_response
```

## Step 8: Get Video Analytics

```python
def get_video_stats(access_token, video_id):
    credentials = Credentials(token=access_token)
    youtube = build('youtube', 'v3', credentials=credentials)
    
    response = youtube.videos().list(
        part='statistics,snippet',
        id=video_id
    ).execute()
    
    if not response['items']:
        return None
    
    video = response['items'][0]
    return {
        'views': int(video['statistics'].get('viewCount', 0)),
        'likes': int(video['statistics'].get('likeCount', 0)),
        'comments': int(video['statistics'].get('commentCount', 0)),
        'favorites': int(video['statistics'].get('favoriteCount', 0))
    }

def get_channel_analytics(access_token, channel_id, start_date, end_date):
    credentials = Credentials(token=access_token)
    youtube = build('youtubeAnalytics', 'v2', credentials=credentials)
    
    response = youtube.reports().query(
        ids=f'channel=={channel_id}',
        startDate=start_date,  # YYYY-MM-DD
        endDate=end_date,
        metrics='views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration',
        dimensions='day'
    ).execute()
    
    return response
```

## Step 9: List Channel Videos

```python
def list_channel_videos(access_token, channel_id, max_results=50):
    credentials = Credentials(token=access_token)
    youtube = build('youtube', 'v3', credentials=credentials)
    
    # Get uploads playlist ID
    channel_response = youtube.channels().list(
        id=channel_id,
        part='contentDetails'
    ).execute()
    
    uploads_playlist_id = channel_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
    
    # Get videos from uploads playlist
    playlist_response = youtube.playlistItems().list(
        playlistId=uploads_playlist_id,
        part='snippet',
        maxResults=max_results
    ).execute()
    
    return playlist_response['items']
```

## Quotas & Limits

### API Quota
- **10,000 units per day** (default)
- Video upload costs **1600 units**
- Request quota increase if needed

### Upload Limits
- **File size**: 256 GB max
- **Length**: 12 hours max (15 min for unverified accounts)
- **Daily uploads**: Varies by account standing

### Rate Limits
- Queries per second (QPS) limits apply
- Use exponential backoff on 429 errors

## Troubleshooting

### "Access Denied: YouTube Data API has not been used"
- Enable YouTube Data API v3 in Google Cloud Console

### "Invalid client: Unauthorized"
- Check OAuth client ID and secret
- Verify redirect URI matches exactly

### "Quota exceeded"
- Request quota increase in Google Cloud Console
- Optimize API calls (batch requests)

### "Upload failed: Invalid request"
- Check video file format (MP4, MOV, AVI, etc.)
- Verify file isn't corrupted
- Check if account is verified for uploads >15 min

## Best Practices

1. **Store refresh tokens** - access tokens expire hourly
2. **Implement retry logic** - uploads can fail
3. **Use resumable uploads** - for large files
4. **Monitor quota usage** - in Cloud Console
5. **Optimize thumbnails** - 1280x720 resolution
6. **Add captions** - improves accessibility and SEO

## Resources

- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [API Reference](https://developers.google.com/youtube/v3/docs)
- [Python Quickstart](https://developers.google.com/youtube/v3/quickstart/python)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
