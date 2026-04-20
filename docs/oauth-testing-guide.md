# OAuth Testing Guide - Manual Steps

## Prerequisites
- You're logged into Schedora as admin
- Each platform's developer console has the callback URL whitelisted

---

## Testing Instagram OAuth

1. Go to **https://sechdora.onrender.com/settings/accounts**
2. Click **"Start scheduling to Instagram"**
3. You'll be redirected to Instagram's authorization page
4. Log in with your Instagram Business/Creator account
5. Click **"Authorize"**
6. You'll be redirected back to Schedora's callback URL
7. Instagram should appear as "Active" in Connected Accounts

**Callback URL for Instagram:**
```
https://sechdora.onrender.com/api/social-accounts/callback/instagram
```

**Troubleshooting:**
- If you get "Invalid redirect_uri": Verify the exact callback URL is whitelisted in Meta Developer Console
- If you get "User hasn't authorized application": Make sure your Instagram account is Business/Creator type
- If token exchange fails: Check that App Secret matches in Meta Developer Console

---

## Testing Facebook OAuth

1. Go to **Connected Accounts** page
2. Click **"Start scheduling to Facebook"**
3. Log in with your Facebook account that manages Pages
4. Authorize the requested permissions (pages_manage_posts, pages_read_engagement)
5. Select which Pages to give access to
6. Facebook should appear as "Active"

**Callback URL for Facebook:**
```
https://sechdora.onrender.com/api/social-accounts/callback/facebook
```

**Troubleshooting:**
- Ensure your Meta app has Facebook Login product enabled
- Your Facebook account must manage at least one Page
- App must be in Live mode or you must be added as a Tester

---

## Testing Twitter (X) OAuth

1. Go to **Connected Accounts** page
2. Click **"Start scheduling to Twitter (X)"**
3. Log in with your Twitter account
4. Review requested permissions (tweet.read, tweet.write, users.read)
5. Click **"Authorize app"**
6. Twitter should appear as "Active"

**Callback URL for Twitter:**
```
https://sechdora.onrender.com/api/social-accounts/callback/twitter
```

**Troubleshooting:**
- Ensure OAuth 2.0 is enabled in Twitter Developer Portal
- App type must be "Web App" (not Native)
- Verify Client ID matches (starts with Y3hq...)

---

## Testing LinkedIn OAuth

1. Go to **Connected Accounts** page
2. Click **"Start scheduling to LinkedIn"**
3. Log in with your LinkedIn account
4. Authorize the requested permissions
5. LinkedIn should appear as "Active"

**Callback URL for LinkedIn:**
```
https://sechdora.onrender.com/api/social-accounts/callback/linkedin
```

**Troubleshooting:**
- Ensure "Sign In with LinkedIn" and "Share on LinkedIn" products are enabled
- Verify domain in LinkedIn app settings
- Client Secret may contain special characters — it's stored correctly in .env

---

## Testing YouTube OAuth

1. Go to **Connected Accounts** page
2. Click **"Start scheduling to YouTube"**
3. Log in with your Google account that owns a YouTube channel
4. Review and accept YouTube Data API permissions
5. YouTube should appear as "Active"

**Callback URL for YouTube:**
```
https://sechdora.onrender.com/api/social-accounts/callback/youtube
```

**Troubleshooting:**
- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- OAuth consent screen must be configured
- If in Testing mode, add your Google email as a test user
- Check redirect URI matches exactly (including trailing slashes)

---

## After Connecting

Once a platform shows "Active":
1. Go to **Create Post**
2. Select that platform
3. Write content and click **Schedule Post**
4. The post will be queued for publishing at the scheduled time

**Note:** Actual publishing to platforms is currently simulated. The OAuth connection stores valid tokens that would be used for real API calls once the publishing integration is fully activated.

---

## Verifying Token Storage

To confirm tokens are stored correctly, check the backend:
```bash
# Via API (admin only)
curl -s "https://sechdora.onrender.com/api/social-accounts" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Each connected account should show:
- `status: "connected"`
- `platform: "instagram"` (or facebook, twitter, etc.)
- `connected_at: "2026-04-17T..."`
