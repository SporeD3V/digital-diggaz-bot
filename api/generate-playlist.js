/**
 * @fileoverview Main API route for generating monthly Spotify playlists.
 * Triggered by Vercel cron on 1st of each month, or manually via GET request.
 * Scans Facebook group posts and creates a curated playlist of new releases.
 */

const { getPreviousMonthBounds } = require('../lib/date-utils');
const { fetchGroupPosts, validateConfig: validateFbConfig } = require('../lib/facebook');
const {
  getAccessToken,
  searchTrack,
  getTrackById,
  createPlaylist,
  addTracksToPlaylist,
  validateConfig: validateSpotifyConfig
} = require('../lib/spotify');
const { extractMusicFromPost } = require('../lib/music-detector');

/**
 * Delay between processing posts to avoid API rate limits.
 * @type {number}
 */
const POST_PROCESS_DELAY_MS = 200;

/**
 * Sleep helper for rate limiting.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Load and validate all configuration from environment variables.
 * Fails fast with clear error messages for missing config.
 * 
 * @returns {{ facebook: Object, spotify: Object }} Validated config objects
 * @throws {Error} If required env vars are missing
 */
function loadConfig() {
  const facebook = {
    groupId: process.env.GROUP_ID,
    accessToken: process.env.FB_TOKEN
  };
  
  const spotify = {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
    userId: process.env.SPOTIFY_USER_ID
  };
  
  validateFbConfig(facebook.groupId, facebook.accessToken);
  validateSpotifyConfig(spotify);
  
  return { facebook, spotify };
}

/**
 * Process a single music candidate and search for matching Spotify track.
 * Handles both direct Spotify URLs and text-based searches.
 * 
 * @param {Object} candidate - Music candidate from extractMusicFromPost
 * @param {string} targetYearMonth - Target month in "YYYY-MM" format
 * @param {string} spotifyToken - Spotify access token
 * @returns {Promise<Object|null>} Track info or null if no match
 */
async function processCandidate(candidate, targetYearMonth, spotifyToken) {
  /**
   * If we have a direct Spotify track ID, fetch it directly.
   * This is the most accurate path - no search needed.
   */
  if (candidate.spotifyTrackId) {
    console.log(`[Process] Direct Spotify track: ${candidate.spotifyTrackId}`);
    return getTrackById(candidate.spotifyTrackId, targetYearMonth, spotifyToken);
  }
  
  /**
   * Otherwise, search Spotify using extracted info.
   * Uses artist/track if available, falls back to raw query.
   */
  if (candidate.searchQuery) {
    console.log(`[Process] Searching: "${candidate.searchQuery}"`);
    return searchTrack({
      query: candidate.searchQuery,
      artist: candidate.artist,
      track: candidate.track,
      targetYearMonth,
      token: spotifyToken
    });
  }
  
  return null;
}

/**
 * Main playlist generation handler (Vercel Serverless Function).
 * Orchestrates the full flow: fetch posts → extract music → search → create playlist.
 * 
 * WHY (req, res) signature: Vercel Functions use Node.js style handlers.
 * This is different from Edge Functions which use Web API (Request/Response).
 * 
 * @param {Object} req - Vercel request object (extends Node.js IncomingMessage)
 * @param {Object} res - Vercel response object (extends Node.js ServerResponse)
 */
module.exports = async function handler(req, res) {
  const startTime = Date.now();
  
  /**
   * Stats object tracks progress for the response.
   * Updated throughout the process for final reporting.
   */
  const stats = {
    postsScanned: 0,
    musicCandidates: 0,
    tracksMatched: 0,
    tracksAdded: 0,
    tracksSkipped: 0,
    errors: []
  };
  
  console.log('='.repeat(60));
  console.log('[Start] Digital Diggaz Playlist Generator');
  console.log('='.repeat(60));
  
  try {
    /** Step 1: Load and validate configuration */
    console.log('\n[Step 1] Loading configuration...');
    const config = loadConfig();
    console.log('[Config] All environment variables validated');
    
    /** Step 2: Calculate previous month boundaries */
    console.log('\n[Step 2] Calculating date range...');
    const monthInfo = getPreviousMonthBounds();
    console.log(`[Dates] Target month: ${monthInfo.monthName} ${monthInfo.year}`);
    console.log(`[Dates] Range: ${monthInfo.startDate.toISOString()} to ${monthInfo.endDate.toISOString()}`);
    console.log(`[Dates] Release filter: ${monthInfo.yearMonth}`);
    
    /** Step 3: Get Spotify access token */
    console.log('\n[Step 3] Authenticating with Spotify...');
    const spotifyToken = await getAccessToken(config.spotify);
    
    /** Step 4: Fetch Facebook group posts */
    console.log('\n[Step 4] Fetching Facebook group posts...');
    const posts = await fetchGroupPosts({
      groupId: config.facebook.groupId,
      accessToken: config.facebook.accessToken,
      startDate: monthInfo.startDate,
      endDate: monthInfo.endDate
    });
    stats.postsScanned = posts.length;
    
    if (posts.length === 0) {
      console.log('[Warning] No posts found in date range');
      return res.status(200).json({
        success: true,
        message: 'No posts found in the target month',
        stats,
        duration: Date.now() - startTime
      });
    }
    
    /** Step 5: Extract music from posts */
    console.log('\n[Step 5] Extracting music from posts...');
    const allCandidates = [];
    
    for (const post of posts) {
      const candidates = extractMusicFromPost(post);
      allCandidates.push(...candidates.map(c => ({ ...c, postId: post.id })));
    }
    
    stats.musicCandidates = allCandidates.length;
    console.log(`[Extract] Found ${allCandidates.length} music candidates from ${posts.length} posts`);
    
    if (allCandidates.length === 0) {
      console.log('[Warning] No music found in posts');
      return res.status(200).json({
        success: true,
        message: 'No music links found in posts',
        stats,
        duration: Date.now() - startTime
      });
    }
    
    /** Step 6: Search Spotify for matching tracks */
    console.log('\n[Step 6] Searching Spotify for tracks...');
    const matchedTracks = new Map();
    
    for (const candidate of allCandidates) {
      try {
        const track = await processCandidate(candidate, monthInfo.yearMonth, spotifyToken);
        
        if (track && !matchedTracks.has(track.id)) {
          matchedTracks.set(track.id, track);
          console.log(`[Match] Found: ${track.artists.join(', ')} - ${track.name} (${track.releaseDate})`);
        }
        
        await sleep(POST_PROCESS_DELAY_MS);
        
      } catch (error) {
        console.error(`[Error] Processing candidate:`, error.message);
        stats.errors.push(error.message);
      }
    }
    
    stats.tracksMatched = matchedTracks.size;
    console.log(`[Search] Matched ${matchedTracks.size} unique tracks from target month`);
    
    if (matchedTracks.size === 0) {
      console.log('[Warning] No tracks matched release date filter');
      return res.status(200).json({
        success: true,
        message: `No tracks from ${monthInfo.monthName} ${monthInfo.year} found`,
        stats,
        duration: Date.now() - startTime
      });
    }
    
    /** Step 7: Create Spotify playlist */
    console.log('\n[Step 7] Creating Spotify playlist...');
    const playlistName = `Digital Diggaz ${monthInfo.monthName} ${monthInfo.year}`;
    const playlistDescription = `Music shared in Digital Diggaz during ${monthInfo.monthName} ${monthInfo.year}. Auto-generated playlist featuring new releases only.`;
    
    const playlist = await createPlaylist({
      userId: config.spotify.userId,
      name: playlistName,
      description: playlistDescription,
      token: spotifyToken
    });
    
    /** Step 8: Add tracks to playlist */
    console.log('\n[Step 8] Adding tracks to playlist...');
    const trackUris = Array.from(matchedTracks.values()).map(t => t.uri);
    
    const addResult = await addTracksToPlaylist({
      playlistId: playlist.id,
      trackUris,
      token: spotifyToken
    });
    
    stats.tracksAdded = addResult.added;
    stats.tracksSkipped = addResult.skipped;
    
    /** Final summary */
    const duration = Date.now() - startTime;
    console.log('\n' + '='.repeat(60));
    console.log('[Complete] Playlist generation finished');
    console.log('='.repeat(60));
    console.log(`Playlist: ${playlist.url}`);
    console.log(`Posts scanned: ${stats.postsScanned}`);
    console.log(`Music candidates: ${stats.musicCandidates}`);
    console.log(`Tracks matched: ${stats.tracksMatched}`);
    console.log(`Tracks added: ${stats.tracksAdded}`);
    console.log(`Tracks skipped (dupes): ${stats.tracksSkipped}`);
    console.log(`Duration: ${duration}ms`);
    
    /** Return success response with playlist details */
    return res.status(200).json({
      success: true,
      message: `Created playlist for ${monthInfo.monthName} ${monthInfo.year}`,
      playlist: {
        name: playlistName,
        url: playlist.url,
        id: playlist.id
      },
      stats,
      duration
    });
    
  } catch (error) {
    /**
     * Top-level error handler.
     * Logs full error for Vercel dashboard, returns sanitized response.
     */
    console.error('\n[Fatal Error]', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stats,
      duration: Date.now() - startTime
    });
  }
};
