# Digital Diggaz Bot

Automated monthly Spotify playlist generator for the Digital Diggaz community. Processes music links to find matching Spotify tracks released that month and creates a curated private playlist.

> **Note:** Facebook Groups API was deprecated in Feb 2026. The bot now requires manual link submission instead of automatic group scanning.

## Features

- **Automatic Scheduling**: Runs on 1st of each month at 00:00 UTC via Vercel Cron
- **Multi-Platform Detection**: Extracts music from YouTube, SoundCloud, Spotify, Bandcamp, Apple Music, Tidal, Deezer links
- **Smart Filtering**: Only includes tracks released in the target month
- **Deduplication**: Prevents duplicate tracks in playlists
- **Private Playlists**: Creates private playlists for manual review before sharing
- **Manual Trigger**: Can be triggered anytime via API endpoint
- **Admin Dashboard**: React + TypeScript dashboard at `/admin` combining system status and configuration
- **Manual Link Submission**: Paste music links via admin panel (replaces deprecated Facebook API)
- **System Status**: Real-time indicators for MongoDB and Spotify connection status
- **API Connection Testing**: Test Spotify credentials before saving
- **Remember Me**: Optional persistent login for admin panel
- **MongoDB Storage**: Securely store configuration in MongoDB Atlas

## Project Structure

```
digital-diggaz-bot/
├── admin/                        # React + TypeScript admin panel
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.tsx         # Login form with Remember Me
│   │   │   ├── ConfigForm.tsx    # Dashboard with status + config forms
│   │   │   └── styles.css        # Component styles
│   │   ├── App.tsx               # Main app with auth logic
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── main.tsx              # React entry point
│   ├── package.json              # Admin dependencies (React, Vite)
│   └── vite.config.ts            # Vite build config
├── api/
│   ├── auth/
│   │   ├── login.js              # Password authentication
│   │   └── verify.js             # Token verification
│   ├── test/
│   │   ├── facebook.js           # DEPRECATED - Returns deprecation notice
│   │   └── spotify.js            # Test Spotify API connection
│   ├── generate-playlist.js      # Main playlist generation
│   ├── submit-links.js           # Submit music links for processing
│   ├── get-links.js              # Retrieve submitted links
│   ├── save-config.js            # Save configuration to MongoDB
│   └── admin.js                  # View stored configurations
├── lib/
│   ├── date-utils.js             # Date calculations
│   ├── facebook.js               # DEPRECATED - Facebook Groups API no longer works
│   ├── mongodb.js                # MongoDB Atlas client
│   ├── music-detector.js         # URL extraction and detection
│   └── spotify.js                # Spotify Web API client
├── public/
│   ├── index.html                # Landing page
│   └── admin/                    # Built admin panel (generated)
├── .env.example                  # Environment variable template
├── package.json                  # Root dependencies and scripts
├── vercel.json                   # Vercel configuration
└── README.md                     # This file
```

## Prerequisites

1. **Spotify Developer App** with OAuth configured
2. **Vercel Account** (free Hobby tier works)
3. **MongoDB Atlas Account** (free tier works)

## Environment Variables

Only these environment variables are required in Vercel. Spotify credentials are stored in MongoDB via the admin panel.

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string (auto-set via Vercel integration) |
| `ADMIN_PASSWORD` | Password for admin panel login at `/admin` |
| `ADMIN_SECRET` | (Optional) Secret for viewing full config via `/api/admin` |

### Spotify Credentials (stored in MongoDB)

These are configured via the admin panel at `/admin` and stored securely in MongoDB:

| Credential | Description |
|------------|-------------|
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

### 2. Configure Spotify

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

### 3. Configure MongoDB Atlas

**Option A: Vercel Integration (Recommended)**

1. Go to your Vercel project dashboard
2. Click **Storage** tab → **Connect Database**
3. Select **MongoDB Atlas** from marketplace
4. Follow prompts to create/connect Atlas cluster
5. `MONGODB_URI` is automatically added to your env vars

**Option B: Manual Setup**

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free M0 cluster
3. Create a database user with read/write access
4. Whitelist `0.0.0.0/0` for Vercel serverless (or use Vercel's IP list)
5. Get connection string: Click **Connect** → **Connect your application**
6. Add to Vercel:
```bash
vercel env add MONGODB_URI
# Paste: mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 4. Set Environment Variables

For local development:
```bash
cp .env.example .env.local
# Edit .env.local with MONGODB_URI and ADMIN_PASSWORD
```

For Vercel deployment:
```bash
vercel env add MONGODB_URI       # From MongoDB Atlas (or use Vercel integration)
vercel env add ADMIN_PASSWORD    # Required: for /admin panel login
vercel env add ADMIN_SECRET      # Optional: for /api/admin access
```

> **Note:** Spotify credentials are configured via the admin panel at `/admin` after deployment, not as environment variables.

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

The build process automatically compiles the React admin panel to `public/admin/`.

## Usage

### Admin Dashboard

The admin dashboard combines system status and API configuration in one screen.

> **Note:** The root URL (`/`) automatically redirects to `/admin`.

1. Open `https://your-project.vercel.app/admin`
2. Enter your `ADMIN_PASSWORD` to login
3. View **System Status** - green/red indicators for MongoDB and Spotify
4. **Submit Music Links** - paste links from YouTube, SoundCloud, Spotify, etc. (one per line)
5. Configure **Spotify** - enter all credentials, click **Test**, then **Save Spotify Config**

### Submitting Music Links

Since the Facebook Groups API is deprecated, music links must be submitted manually:

1. Go to the admin dashboard at `/admin`
2. In the **Submit Music Links** section, paste music URLs
3. Supports: YouTube, SoundCloud, Spotify, Bandcamp, Apple Music, Tidal, Deezer
4. Links can be one per line, comma-separated, or space-separated
5. Click **Submit Links** - duplicates are automatically skipped
6. Links are stored by month and processed when the playlist is generated

### Admin API

```bash
# List all configs (metadata only)
curl https://your-project.vercel.app/api/admin

# View specific config (masked tokens)
curl https://your-project.vercel.app/api/admin?projectId=default

# View full secrets (requires ADMIN_SECRET)
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  "https://your-project.vercel.app/api/admin?projectId=default&showSecrets=true"
```

### Status Page

Check system health at `/status` - shows green/red indicators for each component:

- **MongoDB**: Database connection status
- **Spotify**: Configuration saved status
- **Next Run**: When the cron job will execute

API endpoint: `GET /api/status` returns JSON with `hasMongoConnection`, `hasSpotifyConfig`, `nextCronRunDescription`.

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
