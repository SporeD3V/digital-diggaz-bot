/**
 * @fileoverview Spotify Embed utilities
 * Uses public oEmbed API (no authentication required)
 * 
 * oEmbed endpoint: https://open.spotify.com/oembed?url=SPOTIFY_URL
 * Returns: { title, thumbnail_url, html (iframe), provider_name, etc. }
 */

/**
 * Get playlist embed data via Spotify's public oEmbed API
 * No API keys or authentication required
 * 
 * @param {string} playlistId - Spotify playlist ID
 * @returns {Promise<Object>} oEmbed response with title, thumbnail, iframe HTML
 */
async function getPlaylistEmbed(playlistId) {
  const playlistUrl = `https://open.spotify.com/playlist/${playlistId}`;
  const oEmbedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(playlistUrl)}`;

  try {
    const response = await fetch(oEmbedUrl);
    
    if (!response.ok) {
      throw new Error(`oEmbed request failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      id: playlistId,
      title: data.title || 'Unknown Playlist',
      thumbnail: data.thumbnail_url || null,
      iframeHtml: data.html || null,
      provider: data.provider_name || 'Spotify',
      url: playlistUrl,
    };
  } catch (error) {
    console.error(`[oEmbed] Error fetching playlist ${playlistId}:`, error.message);
    
    // Return fallback data
    return {
      id: playlistId,
      title: 'Digital Diggaz',
      thumbnail: null,
      iframeHtml: null,
      provider: 'Spotify',
      url: playlistUrl,
    };
  }
}

/**
 * Generate Spotify embed iframe URL
 * @param {string} playlistId - Spotify playlist ID
 * @param {Object} options - Embed options
 * @returns {string} Embed iframe URL
 */
function getEmbedUrl(playlistId, options = {}) {
  const { theme = 0, compact = false } = options;
  // theme: 0 = default, 1 = dark
  // compact: smaller height
  
  const baseUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
  const params = new URLSearchParams({
    utm_source: 'generator',
    theme: theme.toString(),
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get multiple playlist embeds
 * @param {string[]} playlistIds - Array of playlist IDs
 * @returns {Promise<Object[]>} Array of embed data
 */
async function getMultiplePlaylistEmbeds(playlistIds) {
  const promises = playlistIds.map(id => getPlaylistEmbed(id));
  return Promise.all(promises);
}

module.exports = {
  getPlaylistEmbed,
  getEmbedUrl,
  getMultiplePlaylistEmbeds,
};
