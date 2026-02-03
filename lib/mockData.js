/**
 * Mock data for development/demo when Spotify API is unavailable
 * Used when SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET are not set
 */

// Sample track data mimicking Spotify API response
const mockTracks = [
  { id: '1', name: 'Midnight Groove', artists: ['DJ Shadow', 'Cut Chemist'], duration_ms: 245000, added_at: '2026-02-01T12:00:00Z' },
  { id: '2', name: 'Underground Vibes', artists: ['Madlib'], duration_ms: 198000, added_at: '2026-02-01T14:30:00Z' },
  { id: '3', name: 'Bass Culture', artists: ['J Dilla', 'Questlove'], duration_ms: 312000, added_at: '2026-01-28T09:15:00Z' },
  { id: '4', name: 'Soul Session', artists: ['Kaytranada'], duration_ms: 267000, added_at: '2026-01-25T18:45:00Z' },
  { id: '5', name: 'Night Rider', artists: ['Flying Lotus'], duration_ms: 289000, added_at: '2026-01-22T21:00:00Z' },
  { id: '6', name: 'Deep Funk', artists: ['Thundercat', 'Flying Lotus'], duration_ms: 234000, added_at: '2026-01-20T16:30:00Z' },
  { id: '7', name: 'Cosmic Waves', artists: ['Kamasi Washington'], duration_ms: 456000, added_at: '2026-01-18T11:00:00Z' },
  { id: '8', name: 'Electric Dreams', artists: ['Toro y Moi'], duration_ms: 203000, added_at: '2026-01-15T08:20:00Z' },
  { id: '9', name: 'Sunset Boulevard', artists: ['Khruangbin'], duration_ms: 278000, added_at: '2026-01-12T19:45:00Z' },
  { id: '10', name: 'Jazz Fusion', artists: ['Robert Glasper', 'Terrace Martin'], duration_ms: 345000, added_at: '2026-01-10T14:00:00Z' },
  { id: '11', name: 'Lo-Fi Nights', artists: ['Nujabes'], duration_ms: 256000, added_at: '2026-01-08T22:30:00Z' },
  { id: '12', name: 'Beat Tape Vol. 1', artists: ['Knxwledge'], duration_ms: 189000, added_at: '2026-01-05T10:15:00Z' },
  { id: '13', name: 'Smooth Operator', artists: ['Anderson .Paak'], duration_ms: 298000, added_at: '2026-01-03T17:00:00Z' },
  { id: '14', name: 'Vinyl Days', artists: ['DJ Premier'], duration_ms: 267000, added_at: '2026-01-01T09:00:00Z' },
  { id: '15', name: 'Crate Digger', artists: ['Madlib', 'J Dilla'], duration_ms: 312000, added_at: '2025-12-28T13:30:00Z' },
];

// Historical tracks (older playlist)
const mockHistoricalTracks = [
  { id: '16', name: 'Winter Chill', artists: ['Bonobo'], duration_ms: 289000, added_at: '2025-12-15T10:00:00Z' },
  { id: '17', name: 'Autumn Leaves', artists: ['Four Tet'], duration_ms: 334000, added_at: '2025-11-20T14:00:00Z' },
  { id: '18', name: 'Summer Breeze', artists: ['Caribou'], duration_ms: 267000, added_at: '2025-10-10T16:30:00Z' },
  { id: '19', name: 'Spring Awakening', artists: ['Tycho'], duration_ms: 245000, added_at: '2025-09-05T11:45:00Z' },
  { id: '20', name: 'Nocturnal', artists: ['Floating Points'], duration_ms: 423000, added_at: '2025-08-22T20:00:00Z' },
  { id: '3', name: 'Bass Culture', artists: ['J Dilla', 'Questlove'], duration_ms: 312000, added_at: '2025-07-15T09:15:00Z' }, // duplicate
  { id: '7', name: 'Cosmic Waves', artists: ['Kamasi Washington'], duration_ms: 456000, added_at: '2025-06-10T11:00:00Z' }, // duplicate
];

/**
 * Generate mock stats data for the frontend
 * @returns {Object} Mock stats matching the real API response format
 */
function getMockStats() {
  // Combine all tracks and dedupe by ID
  const allTracks = [...mockTracks, ...mockHistoricalTracks];
  const uniqueTracksMap = new Map();
  allTracks.forEach(track => {
    if (!uniqueTracksMap.has(track.id)) {
      uniqueTracksMap.set(track.id, track);
    }
  });
  const uniqueTracks = Array.from(uniqueTracksMap.values());

  // Calculate totals
  const totalDuration = uniqueTracks.reduce((sum, t) => sum + t.duration_ms, 0);
  const currentDuration = mockTracks.reduce((sum, t) => sum + t.duration_ms, 0);

  // Get top artists
  const artistCounts = {};
  uniqueTracks.forEach(track => {
    track.artists.forEach(artist => {
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
  });
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Get new tracks (in main but not in historical)
  const historicalIds = new Set(mockHistoricalTracks.map(t => t.id));
  const newTracks = mockTracks
    .filter(t => !historicalIds.has(t.id))
    .sort((a, b) => new Date(b.added_at) - new Date(a.added_at))
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists,
      addedAt: t.added_at,
    }));

  return {
    // Flag to indicate this is mock data
    isMockData: true,

    // Main playlist info
    main: {
      id: '7cpyeFEc4C2DXR1C1oQO58',
      name: 'Digital Diggaz',
      coverImage: 'https://placehold.co/300x300/1DB954/white?text=Digital+Diggaz',
      followers: 1247,
      url: 'https://open.spotify.com/playlist/7cpyeFEc4C2DXR1C1oQO58',
    },

    // Total stats (all unique tracks across all playlists)
    total: {
      tracks: uniqueTracks.length,
      durationMs: totalDuration,
    },

    // Current playlist stats
    current: {
      tracks: mockTracks.length,
      durationMs: currentDuration,
    },

    // Top 10 artists by track count
    topArtists,

    // New tracks in main that weren't in historical
    newTracks,

    // Other/historical playlists
    otherPlaylists: [
      {
        id: 'historical_dec_2025',
        name: 'Digital Diggaz December 2025',
        url: 'https://open.spotify.com/playlist/example1',
        trackCount: 5,
        coverImage: 'https://placehold.co/64x64/535353/white?text=Dec',
      },
      {
        id: 'historical_nov_2025',
        name: 'Digital Diggaz November 2025',
        url: 'https://open.spotify.com/playlist/example2',
        trackCount: 2,
        coverImage: 'https://placehold.co/64x64/535353/white?text=Nov',
      },
    ],

    // Tracks available for voting (current playlist tracks)
    votableTracks: mockTracks.slice(0, 10).map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists,
    })),

    // Timestamp
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  getMockStats,
};
