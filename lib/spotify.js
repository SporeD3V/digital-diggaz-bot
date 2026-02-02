/**
 * @fileoverview Spotify Web API client for searching tracks and managing playlists.
 * Handles OAuth token refresh, search with filtering, and playlist operations.
 */

const { isReleasedInMonth } = require('./date-utils');

/**
 * Spotify API endpoints.
 * @type {Object}
 */
const SPOTIFY_API = {
  TOKEN: 'https://accounts.spotify.com/api/token',
  SEARCH: 'https://api.spotify.com/v1/search',
  USERS: 'https://api.spotify.com/v1/users',
  PLAYLISTS: 'https://api.spotify.com/v1/playlists',
  TRACKS: 'https://api.spotify.com/v1/tracks'
};

/**
 * Delay between API requests to avoid rate limiting.
 * Spotify allows 100+ requests/minute but we stay conservative.
 * @type {number}
 */
const REQUEST_DELAY_MS = 100;

/**
 * Maximum tracks to add per playlist add request.
 * Spotify's limit is 100 URIs per request.
 * @type {number}
 */
const TRACKS_PER_BATCH = 100;

/**
 * In-memory token cache to avoid refreshing on every request.
 * @type {{ token: string|null, expiresAt: number }}
 */
let tokenCache = { token: null, expiresAt: 0 };

/**
 * Sleep helper for rate limiting.
 * @param {number} ms - Milliseconds to wait
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a valid Spotify access token, refreshing if needed.
 * Uses the refresh token flow since we need offline access.
 * 
 * @param {{
 *   clientId: string,
 *   clientSecret: string,
 *   refreshToken: string
 * }} credentials - Spotify OAuth credentials
 * @returns {Promise<string>} Valid access token
 * @throws {Error} On auth failures
 */
async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  /**
   * Return cached token if still valid (with 60s buffer).
   * Avoids unnecessary token refresh requests.
   */
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }
  
  console.log('[Spotify] Refreshing access token...');
  
  /**
   * Build token refresh request.
   * Uses Basic auth with client credentials + refresh token in body.
   */
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(SPOTIFY_API.TOKEN, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[Spotify] Token refresh failed:', error);
    throw new Error('Spotify token refresh failed. Check SPOTIFY_REFRESH_TOKEN.');
  }
  
  const data = await response.json();
  
  /**
   * Cache the new token with its expiry time.
   * Spotify tokens typically last 1 hour.
   */
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };
  
  console.log('[Spotify] Token refreshed successfully');
  return tokenCache.token;
}

/**
 * Make an authenticated request to the Spotify API.
 * Handles common errors and rate limit retries.
 * 
 * @param {string} url - API endpoint URL
 * @param {string} token - Access token
 * @param {Object} [options] - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} On API errors
 */
async function spotifyRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  /**
   * Handle rate limiting with exponential backoff.
   * Spotify returns Retry-After header on 429 responses.
   */
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
    console.warn(`[Spotify] Rate limited. Waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return spotifyRequest(url, token, options);
  }
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[Spotify] API error:', response.status, error);
    throw new Error(`Spotify API error: ${response.status}`);
  }
  
  /**
   * Some endpoints (like DELETE) return empty body.
   * Handle gracefully to avoid JSON parse errors.
   */
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Search for a track on Spotify and filter by release date.
 * Returns the best match that was released in the target month.
 * 
 * @param {{
 *   query: string,
 *   artist?: string,
 *   track?: string,
 *   targetYearMonth: string,
 *   token: string
 * }} options - Search parameters
 * @returns {Promise<{
 *   id: string,
 *   uri: string,
 *   name: string,
 *   artists: string[],
 *   releaseDate: string
 * }|null>} Matching track or null if none found
 */
async function searchTrack({ query, artist, track, targetYearMonth, token }) {
  /**
   * Build optimized search query.
   * If we have artist/track, use field filters for better accuracy.
   */
  let searchQuery = query;
  
  if (artist && track) {
    searchQuery = `track:${track} artist:${artist}`;
  } else if (track) {
    searchQuery = `track:${track}`;
  } else if (artist) {
    searchQuery = `artist:${artist} ${query}`;
  }
  
  const url = `${SPOTIFY_API.SEARCH}?` + new URLSearchParams({
    q: searchQuery,
    type: 'track',
    limit: '10'
  });
  
  try {
    const data = await spotifyRequest(url, token);
    
    if (!data.tracks?.items?.length) {
      return null;
    }
    
    /**
     * Filter results to only include tracks from target month.
     * Check album.release_date against our YYYY-MM target.
     */
    for (const item of data.tracks.items) {
      const releaseDate = item.album?.release_date;
      
      if (isReleasedInMonth(releaseDate, targetYearMonth)) {
        return {
          id: item.id,
          uri: item.uri,
          name: item.name,
          artists: item.artists.map(a => a.name),
          releaseDate
        };
      }
    }
    
    /**
     * No tracks matched release date filter.
     * This is expected - not all shared music is new releases.
     */
    return null;
    
  } catch (error) {
    console.error(`[Spotify] Search failed for "${searchQuery}":`, error.message);
    return null;
  }
}

/**
 * Get track details by Spotify track ID.
 * Used when we extract track IDs directly from Spotify URLs.
 * 
 * @param {string} trackId - Spotify track ID
 * @param {string} targetYearMonth - Target month for release filter
 * @param {string} token - Access token
 * @returns {Promise<Object|null>} Track info or null if not from target month
 */
async function getTrackById(trackId, targetYearMonth, token) {
  try {
    const data = await spotifyRequest(`${SPOTIFY_API.TRACKS}/${trackId}`, token);
    
    const releaseDate = data.album?.release_date;
    
    if (!isReleasedInMonth(releaseDate, targetYearMonth)) {
      return null;
    }
    
    return {
      id: data.id,
      uri: data.uri,
      name: data.name,
      artists: data.artists.map(a => a.name),
      releaseDate
    };
  } catch (error) {
    console.error(`[Spotify] Get track failed for ID ${trackId}:`, error.message);
    return null;
  }
}

/**
 * Create a new private Spotify playlist.
 * 
 * @param {{
 *   userId: string,
 *   name: string,
 *   description: string,
 *   token: string
 * }} options - Playlist creation options
 * @returns {Promise<{ id: string, url: string }>} Created playlist info
 */
async function createPlaylist({ userId, name, description, token }) {
  console.log(`[Spotify] Creating playlist: ${name}`);
  
  const data = await spotifyRequest(
    `${SPOTIFY_API.USERS}/${userId}/playlists`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        public: false
      })
    }
  );
  
  console.log(`[Spotify] Playlist created: ${data.external_urls.spotify}`);
  
  return {
    id: data.id,
    url: data.external_urls.spotify
  };
}

/**
 * Get all track URIs currently in a playlist.
 * Used for deduplication when adding new tracks.
 * 
 * @param {string} playlistId - Playlist ID
 * @param {string} token - Access token
 * @returns {Promise<Set<string>>} Set of track URIs in playlist
 */
async function getPlaylistTrackUris(playlistId, token) {
  const uris = new Set();
  let url = `${SPOTIFY_API.PLAYLISTS}/${playlistId}/tracks?fields=items(track(uri)),next&limit=100`;
  
  while (url) {
    const data = await spotifyRequest(url, token);
    
    for (const item of data.items || []) {
      if (item.track?.uri) {
        uris.add(item.track.uri);
      }
    }
    
    url = data.next;
    if (url) await sleep(REQUEST_DELAY_MS);
  }
  
  return uris;
}

/**
 * Add tracks to a playlist in batches.
 * Handles deduplication against existing playlist tracks.
 * 
 * @param {{
 *   playlistId: string,
 *   trackUris: string[],
 *   token: string
 * }} options - Add tracks options
 * @returns {Promise<{ added: number, skipped: number }>} Stats
 */
async function addTracksToPlaylist({ playlistId, trackUris, token }) {
  if (!trackUris.length) {
    return { added: 0, skipped: 0 };
  }
  
  /**
   * Get existing tracks for deduplication.
   * Prevents adding the same track multiple times.
   */
  console.log('[Spotify] Checking existing playlist tracks...');
  const existingUris = await getPlaylistTrackUris(playlistId, token);
  
  /** Filter out duplicates */
  const newUris = trackUris.filter(uri => !existingUris.has(uri));
  const skipped = trackUris.length - newUris.length;
  
  if (skipped > 0) {
    console.log(`[Spotify] Skipping ${skipped} duplicate tracks`);
  }
  
  if (!newUris.length) {
    return { added: 0, skipped };
  }
  
  /**
   * Add tracks in batches of 100 (Spotify's limit).
   * Each batch is a separate API call.
   */
  let added = 0;
  
  for (let i = 0; i < newUris.length; i += TRACKS_PER_BATCH) {
    const batch = newUris.slice(i, i + TRACKS_PER_BATCH);
    
    await spotifyRequest(
      `${SPOTIFY_API.PLAYLISTS}/${playlistId}/tracks`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ uris: batch })
      }
    );
    
    added += batch.length;
    console.log(`[Spotify] Added batch: ${added}/${newUris.length} tracks`);
    
    if (i + TRACKS_PER_BATCH < newUris.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }
  
  return { added, skipped };
}

/**
 * Validate Spotify configuration.
 * Call early to fail fast with helpful error messages.
 * 
 * @param {Object} config - Spotify config from env vars
 * @throws {Error} If configuration is incomplete
 */
function validateConfig(config) {
  const required = ['clientId', 'clientSecret', 'refreshToken', 'userId'];
  
  for (const key of required) {
    if (!config[key]) {
      const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
      throw new Error(`SPOTIFY_${envKey} environment variable is required`);
    }
  }
}

module.exports = {
  getAccessToken,
  searchTrack,
  getTrackById,
  createPlaylist,
  addTracksToPlaylist,
  validateConfig
};
