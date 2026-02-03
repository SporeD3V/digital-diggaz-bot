/**
 * @fileoverview Spotify Web API client
 * Handles authentication and playlist data fetching
 * 
 * REQUIRES ENV VARS:
 * - SPOTIFY_CLIENT_ID: Spotify app client ID
 * - SPOTIFY_CLIENT_SECRET: Spotify app client secret
 * - SPOTIFY_REFRESH_TOKEN: Long-lived refresh token
 */

// Spotify API endpoints
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

/**
 * Get a fresh access token using the refresh token
 * Tokens expire after 1 hour, so we refresh on each API call
 * 
 * @returns {Promise<string>} Valid access token
 * @throws {Error} If token refresh fails
 */
async function getAccessToken() {
  // Build the authorization header (Base64 encoded client_id:client_secret)
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  // Validate required env vars
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Spotify credentials in environment variables');
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  // Request new access token
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch playlist metadata (name, cover, followers, track count)
 * 
 * @param {string} playlistId - Spotify playlist ID
 * @param {string} accessToken - Valid access token
 * @returns {Promise<Object>} Playlist metadata
 */
async function getPlaylistMetadata(playlistId, accessToken) {
  const url = `${API_BASE}/playlists/${playlistId}?fields=id,name,external_urls,images,followers,tracks(total)`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist ${playlistId}: ${response.status}`);
  }

  const data = await response.json();

  // Return normalized metadata object
  return {
    id: data.id,
    name: data.name,
    url: data.external_urls?.spotify || `https://open.spotify.com/playlist/${playlistId}`,
    coverImage: data.images?.[0]?.url || null,
    followers: data.followers?.total || 0,
    trackCount: data.tracks?.total || 0,
  };
}

/**
 * Fetch ALL tracks from a playlist (handles pagination)
 * Spotify returns max 100 tracks per request
 * 
 * @param {string} playlistId - Spotify playlist ID
 * @param {string} accessToken - Valid access token
 * @returns {Promise<Array>} Array of track objects
 */
async function getPlaylistTracks(playlistId, accessToken) {
  const tracks = [];
  let offset = 0;
  const limit = 100; // Max allowed by Spotify

  // Keep fetching until we have all tracks
  while (true) {
    const url = `${API_BASE}/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}&fields=items(added_at,track(id,name,duration_ms,artists(name)))`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tracks for ${playlistId}: ${response.status}`);
    }

    const data = await response.json();

    // Process each track item
    for (const item of data.items) {
      // Skip null tracks (can happen with unavailable songs)
      if (!item.track) continue;

      tracks.push({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists?.map(a => a.name) || [],
        durationMs: item.track.duration_ms || 0,
        addedAt: item.added_at,
      });
    }

    // Check if there are more tracks to fetch
    if (data.items.length < limit) {
      break; // No more tracks
    }

    offset += limit;
  }

  return tracks;
}

/**
 * Fetch data for multiple playlists
 * Returns metadata and tracks for each playlist
 * 
 * @param {string[]} playlistIds - Array of playlist IDs
 * @returns {Promise<Object>} Object with metadata and tracks arrays
 */
async function fetchAllPlaylistsData(playlistIds) {
  // Get fresh access token
  const accessToken = await getAccessToken();

  // Fetch all playlists in parallel
  const results = await Promise.all(
    playlistIds.map(async (id) => {
      const metadata = await getPlaylistMetadata(id, accessToken);
      const tracks = await getPlaylistTracks(id, accessToken);
      return { metadata, tracks };
    })
  );

  // Separate metadata and tracks
  return {
    playlists: results.map(r => r.metadata),
    tracksByPlaylist: results.reduce((acc, r, i) => {
      acc[playlistIds[i]] = r.tracks;
      return acc;
    }, {}),
  };
}

// Export functions for use in API routes
module.exports = {
  getAccessToken,
  getPlaylistMetadata,
  getPlaylistTracks,
  fetchAllPlaylistsData,
};
