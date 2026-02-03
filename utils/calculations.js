/**
 * @fileoverview Data calculation utilities
 * Computes stats from raw playlist/track data
 */

/**
 * Get unique tracks by ID from multiple playlists
 * Removes duplicates that appear in multiple playlists
 * 
 * @param {Object} tracksByPlaylist - Object with playlist ID keys and track arrays
 * @returns {Map} Map of unique tracks (trackId -> track object)
 */
function getUniqueTracks(tracksByPlaylist) {
  const uniqueTracks = new Map();

  // Iterate through all playlists
  for (const tracks of Object.values(tracksByPlaylist)) {
    for (const track of tracks) {
      // Only add if not already in map (keeps first occurrence)
      if (!uniqueTracks.has(track.id)) {
        uniqueTracks.set(track.id, track);
      }
    }
  }

  return uniqueTracks;
}

/**
 * Calculate total duration from a collection of tracks
 * 
 * @param {Map|Array} tracks - Map or array of track objects
 * @returns {number} Total duration in milliseconds
 */
function calculateTotalDuration(tracks) {
  // Handle Map
  if (tracks instanceof Map) {
    let total = 0;
    for (const track of tracks.values()) {
      total += track.durationMs || 0;
    }
    return total;
  }

  // Handle Array
  return tracks.reduce((sum, track) => sum + (track.durationMs || 0), 0);
}

/**
 * Count track appearances by artist across all playlists
 * Returns top N artists sorted by track count
 * 
 * @param {Map} uniqueTracks - Map of unique tracks
 * @param {number} limit - Number of top artists to return
 * @returns {Array} Array of { name, count } objects
 */
function getTopArtists(uniqueTracks, limit = 10) {
  const artistCounts = new Map();

  // Count tracks per artist
  for (const track of uniqueTracks.values()) {
    for (const artistName of track.artists) {
      const current = artistCounts.get(artistName) || 0;
      artistCounts.set(artistName, current + 1);
    }
  }

  // Convert to array and sort by count (descending)
  const sorted = Array.from(artistCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Return top N
  return sorted.slice(0, limit);
}

/**
 * Find tracks that are in the main playlist but not in any historical
 * These are "new" tracks for the current month
 * 
 * @param {Array} mainTracks - Tracks from main playlist
 * @param {Object} tracksByPlaylist - All tracks by playlist ID
 * @param {string} mainId - Main playlist ID (to exclude from historical)
 * @returns {Array} New tracks sorted by added_at (newest first)
 */
function getNewTracks(mainTracks, tracksByPlaylist, mainId) {
  // Build set of all historical track IDs
  const historicalIds = new Set();

  for (const [playlistId, tracks] of Object.entries(tracksByPlaylist)) {
    // Skip main playlist
    if (playlistId === mainId) continue;

    for (const track of tracks) {
      historicalIds.add(track.id);
    }
  }

  // Filter main tracks to only those not in historical
  const newTracks = mainTracks.filter(track => !historicalIds.has(track.id));

  // Sort by added_at (newest first)
  return newTracks.sort((a, b) => {
    const dateA = new Date(a.addedAt);
    const dateB = new Date(b.addedAt);
    return dateB - dateA;
  });
}

/**
 * Build complete stats object from playlist data
 * Main function that combines all calculations
 * 
 * @param {Object} data - Data from fetchAllPlaylistsData
 * @param {string} mainId - Main playlist ID
 * @returns {Object} Complete stats object for the frontend
 */
function buildStats(data, mainId) {
  const { playlists, tracksByPlaylist } = data;

  // Get main playlist metadata
  const mainPlaylist = playlists.find(p => p.id === mainId);
  const mainTracks = tracksByPlaylist[mainId] || [];

  // Calculate unique tracks across all playlists
  const uniqueTracks = getUniqueTracks(tracksByPlaylist);

  // Calculate durations
  const totalDurationMs = calculateTotalDuration(uniqueTracks);
  const currentDurationMs = calculateTotalDuration(mainTracks);

  // Get top artists
  const topArtists = getTopArtists(uniqueTracks, 10);

  // Get new tracks (in main but not historical)
  const newTracks = getNewTracks(mainTracks, tracksByPlaylist, mainId);

  // Build other playlists list (excluding main)
  const otherPlaylists = playlists
    .filter(p => p.id !== mainId)
    .map(p => ({
      id: p.id,
      name: p.name,
      url: p.url,
      trackCount: p.trackCount,
    }));

  return {
    // Main playlist info
    main: {
      id: mainPlaylist?.id,
      name: mainPlaylist?.name || 'Digital Diggaz',
      url: mainPlaylist?.url,
      coverImage: mainPlaylist?.coverImage,
      followers: mainPlaylist?.followers || 0,
    },

    // Total stats (all unique tracks)
    total: {
      tracks: uniqueTracks.size,
      durationMs: totalDurationMs,
    },

    // Current stats (main playlist only)
    current: {
      tracks: mainTracks.length,
      durationMs: currentDurationMs,
    },

    // Top 10 artists
    topArtists,

    // New tracks (max 10 for display)
    newTracks: newTracks.slice(0, 10).map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists,
      addedAt: t.addedAt,
    })),

    // Other playlists for bottom section
    otherPlaylists,

    // Timestamp for cache invalidation
    fetchedAt: new Date().toISOString(),
  };
}

// Export all calculation functions
module.exports = {
  getUniqueTracks,
  calculateTotalDuration,
  getTopArtists,
  getNewTracks,
  buildStats,
};
