# Digital Diggaz Bot

Automated monthly Spotify playlist generator for the Digital Diggaz Facebook group. Scans group posts for music links, finds matching Spotify tracks released that month, and creates a curated private playlist.

## Features

- **Automatic Scheduling**: Runs on 1st of each month at 00:00 UTC via Vercel Cron
- **Multi-Platform Detection**: Extracts music from YouTube, SoundCloud, Spotify, Bandcamp, Apple Music, Tidal, Deezer links
- **Smart Filtering**: Only includes tracks released in the target month
- **Deduplication**: Prevents duplicate tracks in playlists
- **Private Playlists**: Creates private playlists for manual review before sharing
- **Manual Trigger**: Can be triggered anytime via API endpoint

## Project Structure

```
digital-diggaz-bot/
├── api/
│   └── generate-playlist.js   # Main API route (Vercel serverless function)
├── lib/
│   ├── date-utils.js          # Date calculations and month boundaries
│   ├── facebook.js            # Facebook Graph API client
│   ├── music-detector.js      # URL extraction and music detection
│   └── spotify.js             # Spotify Web API client
├── .env.example               # Environment variable template
├── package.json               # Dependencies and scripts
├── vercel.json                # Vercel configuration with cron
└── README.md                  # This file
```

## Prerequisites

1. **Facebook Developer App** with access to the target group
2. **Spotify Developer App** with OAuth configured
3. **Vercel Account** (free Hobby tier works)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROUP_ID` | Facebook group ID (from group URL) |
| `FB_TOKEN` | Long-lived Facebook User Access Token |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |
| `SPOTIFY_USER_ID` | Your Spotify username |
| `SPOTIFY_REFRESH_TOKEN` | OAuth refresh token with `playlist-modify-private` scope |

## Setup Guide

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd digital-diggaz-bot
npm install
```

### 2. Configure Facebook

1. Go to [Facebook Developer Portal](https://developers.facebook.com/)
2. Create an app or use existing one
3. Add yourself as a test user if needed
4. Get your Group ID from the group URL: `facebook.com/groups/GROUP_ID`
5. Generate a User Access Token at [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Select your app
   - Add permission: `groups_access_member_info`
   - Generate token
6. Extend token to long-lived (60 days) at [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)

### 3. Configure Spotify

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/callback`
4. Note your Client ID and Client Secret
5. Get your User ID from [Spotify Account](https://www.spotify.com/account/overview/)
6. Generate refresh token:

```bash
# Step 1: Open this URL in browser (replace YOUR_CLIENT_ID)
https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/callback&scope=playlist-modify-private%20playlist-modify-public

# Step 2: After authorizing, you'll be redirected to:
# http://localhost:3000/callback?code=AUTHORIZATION_CODE
# Copy the code from the URL

# Step 3: Exchange code for tokens
curl -X POST https://accounts.spotify.com/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"

# Step 4: Save the refresh_token from the response
```

### 4. Set Environment Variables

For local development:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

For Vercel deployment:
```bash
vercel env add GROUP_ID
vercel env add FB_TOKEN
vercel env add SPOTIFY_CLIENT_ID
vercel env add SPOTIFY_CLIENT_SECRET
vercel env add SPOTIFY_USER_ID
vercel env add SPOTIFY_REFRESH_TOKEN
```

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Usage

### Automatic (Cron)

The bot automatically runs on the 1st of each month at 00:00 UTC. Check Vercel dashboard logs for execution details.

### Manual Trigger

```bash
# Local development
npm run dev
curl http://localhost:3000/api/generate-playlist

# Production
curl https://your-project.vercel.app/api/generate-playlist
```

### Response Format

```json
{
  "success": true,
  "message": "Created playlist for January 2026",
  "playlist": {
    "name": "Digital Diggaz January 2026",
    "url": "https://open.spotify.com/playlist/...",
    "id": "playlist_id"
  },
  "stats": {
    "postsScanned": 150,
    "musicCandidates": 45,
    "tracksMatched": 12,
    "tracksAdded": 12,
    "tracksSkipped": 0,
    "errors": []
  },
  "duration": 15000
}
```

## How It Works

1. **Date Calculation**: Determines previous month boundaries (e.g., on Feb 1st, scans Jan 1-31)
2. **Fetch Posts**: Retrieves all Facebook group posts from the target month
3. **Extract Music**: Parses post text and attachments for music URLs
4. **Search Spotify**: Searches for matching tracks, filtering by release date
5. **Create Playlist**: Creates a private playlist named "Digital Diggaz [Month] [Year]"
6. **Add Tracks**: Adds unique tracks to the playlist (deduped)

## Troubleshooting

### Facebook Token Expired
Facebook tokens expire after 60 days. Regenerate at Graph API Explorer and update `FB_TOKEN`.

### Spotify Token Issues
The refresh token should work indefinitely unless you revoke app access. If issues persist, regenerate via the OAuth flow.

### No Posts Found
- Verify `GROUP_ID` is correct
- Ensure `FB_TOKEN` has group access
- Check if you're a member of the group

### No Tracks Matched
- The filter only includes tracks released in the target month
- Older tracks shared in posts are intentionally excluded

## License

MIT
