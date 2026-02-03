# Digital Diggaz Playlist Tracker

Public stats page for the Digital Diggaz community Spotify playlists. Shows total tracks, listening time, top artists, new additions, and voting for Track of the Month.

## Features

- **Public Stats Page**: Beautiful Tailwind UI showing playlist statistics
- **Total vs Current**: Compare all-time unique tracks vs current month
- **Top Artists**: Ranked list of artists by track count
- **New Tracks**: Recently added tracks not in historical playlists
- **Track of Month Voting**: Community voting with Vercel KV storage
- **Historical Playlists**: Links to all past monthly playlists
- **Follow CTA**: Prominent button to follow the main playlist
- **Auto-refresh**: Refresh button to fetch latest data

## Project Structure

```
digital-diggaz-playlist-tracker/
├── components/
│   ├── Hero.js              # Cover image + follow CTA
│   ├── StatsGrid.js         # Total vs current stats
│   ├── TopArtists.js        # Top 10 artists list
│   ├── NewTracks.js         # New tracks this month
│   ├── VotingSection.js     # Track of Month voting
│   └── OtherPlaylists.js    # Historical playlists list
├── lib/
│   └── spotify.js           # Spotify API client
├── pages/
│   ├── _app.js              # Next.js app wrapper
│   ├── index.js             # Main stats page
│   └── api/
│       ├── stats.js         # GET /api/stats - fetch all data
│       └── vote.js          # GET/POST /api/vote - voting
├── styles/
│   └── globals.css          # Tailwind + custom styles
├── utils/
│   ├── calculations.js      # Stats computation
│   └── formatters.js        # Display formatting
├── .env.example             # Environment template
├── next.config.js           # Next.js config
├── package.json             # Dependencies
├── postcss.config.js        # PostCSS for Tailwind
├── tailwind.config.js       # Tailwind config
└── vercel.json              # Vercel framework config
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app client secret |
| `SPOTIFY_REFRESH_TOKEN` | Yes | OAuth refresh token (scope: `playlist-read-private`) |
| `MAIN_PLAYLIST_ID` | Yes | Main playlist ID (the one that gains followers) |
| `PLAYLIST_IDS` | Yes | Comma-separated: main + all historical IDs |
| `KV_*` | No | Auto-set when Vercel KV is added (for voting) |
| `ANTHROPIC_API_KEY` | No | For future AI features |

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd digital-diggaz-playlist-tracker
npm install
```

### 2. Configure Spotify

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create app, note Client ID and Secret
3. Generate refresh token with `playlist-read-private` scope

### 3. Set Environment Variables

```bash
cp .env.example .env.local
# Edit with your values
```

Or in Vercel:
```bash
vercel env add SPOTIFY_CLIENT_ID
vercel env add SPOTIFY_CLIENT_SECRET
vercel env add SPOTIFY_REFRESH_TOKEN
vercel env add MAIN_PLAYLIST_ID
vercel env add PLAYLIST_IDS
```

### 4. Deploy

```bash
vercel --prod
```

## Playlist Management Workflow

1. **Main Playlist** (fixed ID): This is the permanent playlist URL you share. Followers stay here forever.

2. **Monthly Rotation**:
   - Each month, manually move old tracks to a new "historical" playlist
   - Add the historical playlist ID to `PLAYLIST_IDS`
   - Add fresh tracks to the main playlist

3. **Example PLAYLIST_IDS**:
   ```
   PLAYLIST_IDS=abc123main,xyz789jan2026,def456feb2026
   ```

## API Endpoints

### GET /api/stats

Returns computed playlist statistics:

```json
{
  "main": {
    "name": "Digital Diggaz",
    "coverImage": "https://...",
    "followers": 1234,
    "url": "https://open.spotify.com/playlist/..."
  },
  "total": { "tracks": 500, "durationMs": 123456789 },
  "current": { "tracks": 25, "durationMs": 5678901 },
  "topArtists": [{ "name": "Artist", "count": 10 }],
  "newTracks": [{ "id": "...", "name": "Track", "artists": ["..."] }],
  "otherPlaylists": [{ "name": "Jan 2026", "url": "...", "trackCount": 30 }]
}
```

### GET/POST /api/vote

- **GET**: Returns current month's vote counts
- **POST**: Submit vote `{ trackId, trackName, artists }`

## License

MIT
