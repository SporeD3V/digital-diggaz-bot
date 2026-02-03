# Digital Diggaz Playlist Tracker

Public stats page for the Digital Diggaz community Spotify playlists. Shows total tracks, listening time, top artists, new additions, and voting for Track of the Month.

**No Spotify API keys required** — uses public embeds + hardcoded data.

## Features

- **Spotify Embed Player**: Full interactive playlist embed (no auth needed)
- **Stats Grid**: Total vs current playlist statistics
- **Top Artists**: Ranked list of artists by track count
- **New Tracks**: Recently added tracks
- **Track of Month Voting**: Community voting with Vercel KV storage
- **Historical Playlists**: Links to all past monthly playlists
- **Follow CTA**: Prominent button to follow the main playlist

## How It Works

Since Spotify API keys are unavailable (new integrations on hold), this app uses:

1. **Spotify oEmbed API** (public) — fetches playlist cover image and title
2. **Spotify Iframe Embed** — interactive player, no auth required
3. **Hardcoded Track Data** — manually maintained in `lib/playlistData.js`

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
│   ├── playlistData.js      # Hardcoded track data (edit to update stats)
│   └── spotifyEmbed.js      # oEmbed API utilities
├── pages/
│   ├── _app.js              # Next.js app wrapper
│   ├── index.js             # Main stats page with embed
│   └── api/
│       ├── stats.js         # GET /api/stats
│       └── vote.js          # GET/POST /api/vote
├── styles/
│   └── globals.css          # Tailwind + custom styles
├── utils/
│   └── formatters.js        # Display formatting
├── next.config.js           # Next.js config
├── package.json             # Dependencies
└── vercel.json              # Vercel framework config
```

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd digital-diggaz-playlist-tracker
npm install
```

### 2. Update Playlist Data

Edit `lib/playlistData.js` to add your tracks:

```javascript
const mainPlaylistTracks = [
  {
    id: 'spotify_track_id',
    name: 'Track Name',
    artists: ['Artist 1', 'Artist 2'],
    duration_ms: 210000, // 3:30
    added_at: '2026-02-01T12:00:00Z',
  },
  // ... more tracks
];
```

### 3. Deploy

```bash
vercel --prod
```

No environment variables required for basic functionality!

## Updating Stats

1. Open the playlist in Spotify
2. Edit `lib/playlistData.js` with new track info
3. Commit and push — Vercel auto-deploys

## Optional: Voting Feature

Add Vercel KV storage for the voting feature:

1. Go to Vercel Dashboard → Storage → Add KV
2. `KV_*` environment variables are automatically set
3. Redeploy

## API Endpoints

### GET /api/stats

Returns playlist statistics from hardcoded data + oEmbed cover:

```json
{
  "isHardcodedData": true,
  "main": {
    "name": "Digital Diggaz",
    "coverImage": "https://...",
    "embedUrl": "https://open.spotify.com/embed/playlist/...",
    "url": "https://open.spotify.com/playlist/..."
  },
  "total": { "tracks": 20, "durationMs": 4500000 },
  "current": { "tracks": 5, "durationMs": 1200000 },
  "topArtists": [{ "name": "Artist", "count": 3 }],
  "newTracks": [{ "id": "...", "name": "Track", "artists": ["..."] }]
}
```

### GET/POST /api/vote

- **GET**: Returns current month's vote counts
- **POST**: Submit vote `{ trackId, trackName, artists }`

## Main Playlist

**ID**: `7cpyeFEc4C2DXR1C1oQO58`
**URL**: https://open.spotify.com/playlist/7cpyeFEc4C2DXR1C1oQO58

## License

MIT
