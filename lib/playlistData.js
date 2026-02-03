/**
 * @fileoverview Hardcoded playlist data
 * Since Spotify API keys are unavailable, track data is manually maintained here.
 * 
 * HOW TO UPDATE:
 * 1. Open the playlist in Spotify
 * 2. Add/update track entries with: id, name, artists[], duration_ms, added_at
 * 3. Redeploy to Vercel
 * 
 * PLAYLIST IDs:
 * - Main: 7cpyeFEc4C2DXR1C1oQO58
 */

// Main playlist ID (the one that gains followers)
const MAIN_PLAYLIST_ID = '7cpyeFEc4C2DXR1C1oQO58';

// All playlist IDs (main + historical)
const ALL_PLAYLIST_IDS = [
  '7cpyeFEc4C2DXR1C1oQO58', // Main - Digital Diggaz
  // Add historical playlist IDs here as you create them:
  // 'historical_jan_2026_id',
  // 'historical_feb_2026_id',
];

/**
 * Main playlist track data
 * Update this manually when tracks are added/removed
 * 
 * To get track info from Spotify web player:
 * 1. Right-click track → Share → Copy Song Link → extract ID from URL
 * 2. Track name and artists from display
 * 3. Duration from player (convert to ms: minutes*60000 + seconds*1000)
 */
const mainPlaylistTracks = [
  // Example tracks - REPLACE with actual playlist content
  {
    id: 'track1',
    name: 'Sample Track 1',
    artists: ['Artist A', 'Artist B'],
    duration_ms: 210000, // 3:30
    added_at: '2026-02-01T12:00:00Z',
  },
  {
    id: 'track2',
    name: 'Sample Track 2',
    artists: ['Artist C'],
    duration_ms: 185000, // 3:05
    added_at: '2026-02-01T14:30:00Z',
  },
  {
    id: 'track3',
    name: 'Sample Track 3',
    artists: ['Artist A'],
    duration_ms: 245000, // 4:05
    added_at: '2026-01-28T09:15:00Z',
  },
  {
    id: 'track4',
    name: 'Sample Track 4',
    artists: ['Artist D', 'Artist E'],
    duration_ms: 198000, // 3:18
    added_at: '2026-01-25T18:45:00Z',
  },
  {
    id: 'track5',
    name: 'Sample Track 5',
    artists: ['Artist B'],
    duration_ms: 267000, // 4:27
    added_at: '2026-01-22T21:00:00Z',
  },
];

/**
 * Historical playlist data
 * Key: playlist ID, Value: { name, tracks[] }
 */
const historicalPlaylists = {
  // Example - add real historical playlists here
  // 'historical_jan_2026_id': {
  //   name: 'Digital Diggaz January 2026',
  //   tracks: [
  //     { id: 'old1', name: 'Old Track', artists: ['Artist X'], duration_ms: 200000, added_at: '2026-01-15T10:00:00Z' },
  //   ],
  // },
};

/**
 * Manual follower count (update periodically)
 * Since we can't fetch this without API
 */
const MANUAL_FOLLOWER_COUNT = null; // Set to a number if you want to display it

/**
 * Get all tracks from main playlist
 * @returns {Object[]} Array of track objects
 */
function getMainPlaylistTracks() {
  return mainPlaylistTracks;
}

/**
 * Get tracks from a specific playlist
 * @param {string} playlistId 
 * @returns {Object[]} Array of track objects
 */
function getPlaylistTracks(playlistId) {
  if (playlistId === MAIN_PLAYLIST_ID) {
    return mainPlaylistTracks;
  }
  
  const historical = historicalPlaylists[playlistId];
  return historical ? historical.tracks : [];
}

/**
 * Get all unique tracks across all playlists
 * @returns {Object[]} Deduplicated array of tracks
 */
function getAllUniqueTracks() {
  const allTracks = [...mainPlaylistTracks];
  
  // Add historical tracks
  Object.values(historicalPlaylists).forEach(playlist => {
    allTracks.push(...playlist.tracks);
  });
  
  // Dedupe by track ID
  const uniqueMap = new Map();
  allTracks.forEach(track => {
    if (!uniqueMap.has(track.id)) {
      uniqueMap.set(track.id, track);
    }
  });
  
  return Array.from(uniqueMap.values());
}

/**
 * Calculate total duration from tracks
 * @param {Object[]} tracks 
 * @returns {number} Total duration in ms
 */
function calculateTotalDuration(tracks) {
  return tracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0);
}

/**
 * Get top artists by track count
 * @param {Object[]} tracks 
 * @param {number} limit 
 * @returns {Object[]} Array of { name, count }
 */
function getTopArtists(tracks, limit = 10) {
  const artistCounts = {};
  
  tracks.forEach(track => {
    (track.artists || []).forEach(artist => {
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
  });
  
  return Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

/**
 * Get new tracks (in main but not in historical)
 * @param {number} limit 
 * @returns {Object[]} Array of new tracks
 */
function getNewTracks(limit = 5) {
  // Collect all historical track IDs
  const historicalIds = new Set();
  Object.values(historicalPlaylists).forEach(playlist => {
    playlist.tracks.forEach(track => historicalIds.add(track.id));
  });
  
  // Find tracks in main that aren't in historical
  return mainPlaylistTracks
    .filter(track => !historicalIds.has(track.id))
    .sort((a, b) => new Date(b.added_at) - new Date(a.added_at))
    .slice(0, limit);
}

/**
 * Get historical playlists info
 * @returns {Object[]} Array of { id, name, trackCount }
 */
function getHistoricalPlaylistsInfo() {
  return Object.entries(historicalPlaylists).map(([id, data]) => ({
    id,
    name: data.name,
    trackCount: data.tracks.length,
    url: `https://open.spotify.com/playlist/${id}`,
  }));
}

/**
 * Build complete stats object for API response
 * @returns {Object} Stats matching API response format
 */
function buildStatsFromData() {
  const allUnique = getAllUniqueTracks();
  const mainTracks = getMainPlaylistTracks();
  
  return {
    // Flag indicating data source
    isHardcodedData: true,
    
    // Main playlist info
    main: {
      id: MAIN_PLAYLIST_ID,
      name: 'Digital Diggaz',
      url: `https://open.spotify.com/playlist/${MAIN_PLAYLIST_ID}`,
      followers: MANUAL_FOLLOWER_COUNT,
      embedUrl: `https://open.spotify.com/embed/playlist/${MAIN_PLAYLIST_ID}?utm_source=generator&theme=0`,
    },
    
    // Total stats (all unique tracks)
    total: {
      tracks: allUnique.length,
      durationMs: calculateTotalDuration(allUnique),
    },
    
    // Current/main playlist stats
    current: {
      tracks: mainTracks.length,
      durationMs: calculateTotalDuration(mainTracks),
    },
    
    // Top artists
    topArtists: getTopArtists(allUnique),
    
    // New tracks
    newTracks: getNewTracks().map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists,
      addedAt: t.added_at,
    })),
    
    // Historical playlists
    otherPlaylists: getHistoricalPlaylistsInfo(),
    
    // Votable tracks (from main playlist)
    votableTracks: mainTracks.slice(0, 10).map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists,
    })),
    
    // Timestamp
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  MAIN_PLAYLIST_ID,
  ALL_PLAYLIST_IDS,
  getMainPlaylistTracks,
  getPlaylistTracks,
  getAllUniqueTracks,
  calculateTotalDuration,
  getTopArtists,
  getNewTracks,
  getHistoricalPlaylistsInfo,
  buildStatsFromData,
};
