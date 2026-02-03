/**
 * @fileoverview Stats API endpoint
 * Returns computed playlist statistics as JSON
 * 
 * GET /api/stats
 * 
 * NO SPOTIFY API KEYS REQUIRED
 * Uses hardcoded playlist data + Spotify oEmbed for cover image
 */

import { buildStatsFromData, MAIN_PLAYLIST_ID } from '../../lib/playlistData';
import { getPlaylistEmbed } from '../../lib/spotifyEmbed';

/**
 * API handler for GET /api/stats
 * Returns stats from hardcoded data + oEmbed cover
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
    console.log('[Stats] Building stats from hardcoded data');

    // Get stats from hardcoded playlist data
    const stats = buildStatsFromData();

    // Fetch cover image via oEmbed (public, no auth needed)
    try {
      const embedData = await getPlaylistEmbed(MAIN_PLAYLIST_ID);
      if (embedData.thumbnail) {
        stats.main.coverImage = embedData.thumbnail;
      }
      if (embedData.title) {
        stats.main.name = embedData.title;
      }
    } catch (embedError) {
      console.warn('[Stats] oEmbed fetch failed, using defaults:', embedError.message);
    }

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    return res.status(200).json(stats);

  } catch (error) {
    console.error('[Stats] Error:', error.message);

    return res.status(500).json({ 
      error: 'Failed to build playlist stats',
      message: error.message,
    });
  }
}
