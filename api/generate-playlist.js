/**
 * @fileoverview Main API route for generating monthly Spotify playlists.
 * Triggered by Vercel cron on 1st of each month, or manually via GET request.
 * Processes manually submitted music links and creates a curated playlist.
 * 
 * NOTE: Facebook Groups API was deprecated. Links are now submitted manually
 * via the admin panel and stored in MongoDB.
 */

const { getPreviousMonthBounds } = require('../lib/date-utils');
const {
  getAccessToken,
  searchTrack,
  getTrackById,
  createPlaylist,
  addTracksToPlaylist,
  validateConfig: validateSpotifyConfig
} = require('../lib/spotify');
const { extractMusicUrls } = require('../lib/music-detector');
const { getActiveConfig, connectToDatabase } = require('../lib/mongodb');

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
 * Load and validate Spotify configuration from MongoDB.
 * 
 * @returns {Promise<{ spotify: Object }>} Validated config object
 * @throws {Error} If no config saved or required fields missing
 */
async function loadConfig() {
  const config = await getActiveConfig();
  validateSpotifyConfig(config.spotify);
  return config;
}

/**
 * Fetch submitted links for a specific month from MongoDB.
 * 
 * @param {string} month - Month in "YYYY-MM" format
 * @returns {Promise<string[]>} Array of submitted URLs
 */
async function getSubmittedLinks(month) {
  const db = await connectToDatabase();
  const collection = db.collection('submitted_links');
  const doc = await collection.findOne({ month });
  return doc?.links || [];
}

/**
 * Process a single music URL and search for matching Spotify track.
 * Handles both direct Spotify URLs and other platform URLs.
 * 
 * @param {Object} candidate - Music candidate from extractMusicUrls
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
    linksSubmitted: 0,
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
    /** Step 1: Load and validate configuration from MongoDB */
    console.log('\n[Step 1] Loading configuration from database...');
    const config = await loadConfig();
    console.log('[Config] Configuration loaded and validated');
    
    /** Step 2: Calculate previous month boundaries */
    console.log('\n[Step 2] Calculating date range...');
    const monthInfo = getPreviousMonthBounds();
    console.log(`[Dates] Target month: ${monthInfo.monthName} ${monthInfo.year}`);
    console.log(`[Dates] Range: ${monthInfo.startDate.toISOString()} to ${monthInfo.endDate.toISOString()}`);
    console.log(`[Dates] Release filter: ${monthInfo.yearMonth}`);
    
    /** Step 3: Get Spotify access token */
    console.log('\n[Step 3] Authenticating with Spotify...');
    const spotifyToken = await getAccessToken(config.spotify);
    
    /** Step 4: Fetch submitted links from MongoDB */
    console.log('\n[Step 4] Fetching submitted links...');
    const links = await getSubmittedLinks(monthInfo.yearMonth);
    stats.linksSubmitted = links.length;
    console.log(`[Links] Found ${links.length} submitted links for ${monthInfo.yearMonth}`);
    
    if (links.length === 0) {
      console.log('[Warning] No links submitted for this month');
      return res.status(200).json({
        success: true,
        message: `No links submitted for ${monthInfo.monthName} ${monthInfo.year}. Submit links via the admin panel.`,
        stats,
        duration: Date.now() - startTime
      });
    }
    
    /** Step 5: Extract music info from URLs */
    console.log('\n[Step 5] Processing music URLs...');
    const allCandidates = [];
    
    for (const url of links) {
      const candidates = extractMusicUrls(url);
      allCandidates.push(...candidates);
    }
    
    stats.musicCandidates = allCandidates.length;
    console.log(`[Extract] Found ${allCandidates.length} music candidates from ${links.length} links`);
    
    if (allCandidates.length === 0) {
      console.log('[Warning] No recognizable music URLs found');
      return res.status(200).json({
        success: true,
        message: 'No recognizable music URLs found in submitted links',
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
    console.log(`Links submitted: ${stats.linksSubmitted}`);
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
