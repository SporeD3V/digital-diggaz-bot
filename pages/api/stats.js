/**
 * @fileoverview Stats API endpoint
 * Returns computed playlist statistics as JSON
 * 
 * GET /api/stats
 * 
 * REQUIRES ENV VARS:
 * - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
 * - MAIN_PLAYLIST_ID: The main/current playlist ID
 * - PLAYLIST_IDS: Comma-separated list of all playlist IDs (main + historical)
 */

import { fetchAllPlaylistsData } from '../../lib/spotify';
import { buildStats } from '../../utils/calculations';
import { getMockStats } from '../../lib/mockData';

/**
 * Check if Spotify credentials are configured
 * @returns {boolean} True if all required Spotify env vars are set
 */
function hasSpotifyCredentials() {
  return !!(
    process.env.SPOTIFY_CLIENT_ID &&
    process.env.SPOTIFY_CLIENT_SECRET &&
    process.env.SPOTIFY_REFRESH_TOKEN
  );
}

/**
 * API handler for GET /api/stats
 * Fetches all playlist data and computes stats
 * Falls back to mock data if Spotify credentials are not configured
 * 
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // If Spotify credentials are missing, return mock data
    if (!hasSpotifyCredentials()) {
      console.log('[Stats] Spotify credentials not configured, using mock data');
      const mockStats = getMockStats();
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
      return res.status(200).json(mockStats);
    }

    // Get playlist IDs from environment
    const mainId = process.env.MAIN_PLAYLIST_ID;
    const playlistIdsString = process.env.PLAYLIST_IDS;

    // If playlist IDs missing, also use mock data
    if (!mainId || !playlistIdsString) {
      console.log('[Stats] Playlist IDs not configured, using mock data');
      const mockStats = getMockStats();
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
      return res.status(200).json(mockStats);
    }

    // Parse comma-separated playlist IDs
    const playlistIds = playlistIdsString
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    // Ensure main ID is included
    if (!playlistIds.includes(mainId)) {
      playlistIds.unshift(mainId);
    }

    console.log(`[Stats] Fetching data for ${playlistIds.length} playlists`);

    // Fetch all playlist data from Spotify
    const data = await fetchAllPlaylistsData(playlistIds);

    // Build computed stats
    const stats = buildStats(data, mainId);

    // Cache for 5 minutes (300 seconds)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    return res.status(200).json(stats);

  } catch (error) {
    console.error('[Stats] Error:', error.message);

    return res.status(500).json({ 
      error: 'Failed to fetch playlist stats',
      message: error.message,
    });
  }
}
