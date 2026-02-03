/**
 * @fileoverview Music link detection and metadata extraction.
 * Parses URLs from Facebook posts to identify music content and extract
 * artist/track info for Spotify search queries.
 */

/**
 * Regex patterns to identify music platform URLs.
 * Each pattern captures the domain and path for further parsing.
 * @type {RegExp}
 */
const MUSIC_URL_PATTERNS = [
  /https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/gi,
  /https?:\/\/youtu\.be\/[\w-]+/gi,
  /https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/gi,
  /https?:\/\/open\.spotify\.com\/track\/[\w]+/gi,
  /https?:\/\/(www\.)?spotify\.com\/track\/[\w]+/gi,
  /https?:\/\/([\w-]+\.)?bandcamp\.com\/(track|album)\/[\w-]+/gi,
  /https?:\/\/(www\.)?music\.apple\.com\/[\w\/]+/gi,
  /https?:\/\/(www\.)?tidal\.com\/(browse\/)?(track|album)\/[\d]+/gi,
  /https?:\/\/(www\.)?deezer\.com\/(track|album)\/[\d]+/gi
];

/**
 * Generic URL pattern to catch any link in post text.
 * Used as fallback when specific patterns don't match.
 * @type {RegExp}
 */
const GENERIC_URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

/**
 * Extract all URLs from post text content.
 * Searches both message body and any attachment descriptions.
 * 
 * @param {string} text - Post text content to search
 * @returns {string[]} Array of unique URLs found
 */
function extractUrls(text) {
  if (!text || typeof text !== 'string') return [];
  
  const urls = text.match(GENERIC_URL_PATTERN) || [];
  
  /** Remove duplicates and clean trailing punctuation */
  return [...new Set(urls)].map(url => url.replace(/[.,;:!?)]+$/, ''));
}

/**
 * Check if a URL is from a known music platform.
 * Used to prioritize music links over general URLs.
 * 
 * @param {string} url - URL to check
 * @returns {boolean} True if URL matches a music platform pattern
 */
function isMusicUrl(url) {
  return MUSIC_URL_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(url);
  });
}

/**
 * Detect the music platform from a URL.
 * Used for logging and platform-specific parsing.
 * 
 * @param {string} url - URL to analyze
 * @returns {string} Platform name or 'unknown'
 */
function detectPlatform(url) {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('soundcloud.com')) return 'soundcloud';
  if (lowerUrl.includes('spotify.com')) return 'spotify';
  if (lowerUrl.includes('bandcamp.com')) return 'bandcamp';
  if (lowerUrl.includes('music.apple.com')) return 'apple_music';
  if (lowerUrl.includes('tidal.com')) return 'tidal';
  if (lowerUrl.includes('deezer.com')) return 'deezer';
  
  return 'unknown';
}

/**
 * Extract Spotify track ID from a Spotify URL.
 * Direct IDs can skip search and add tracks directly.
 * 
 * @param {string} url - Spotify track URL
 * @returns {string|null} Track ID or null if not a track URL
 * 
 * @example
 * extractSpotifyTrackId("https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh")
 * // Returns: "4iV5W9uYEdYUVa79Axb7Rh"
 */
function extractSpotifyTrackId(url) {
  const match = url.match(/spotify\.com\/track\/(\w+)/i);
  return match ? match[1] : null;
}

/**
 * Clean and normalize text for search query building.
 * Removes noise like "Official Video", emojis, and extra whitespace.
 * 
 * @param {string} text - Raw text to clean
 * @returns {string} Cleaned text suitable for search
 */
function cleanTextForSearch(text) {
  if (!text) return '';
  
  return text
    /** Remove common YouTube video suffixes */
    .replace(/\(official\s*(music\s*)?video\)/gi, '')
    .replace(/\[official\s*(music\s*)?video\]/gi, '')
    .replace(/official\s*(music\s*)?video/gi, '')
    .replace(/\(lyric\s*video\)/gi, '')
    .replace(/\(audio\)/gi, '')
    .replace(/\(visualizer\)/gi, '')
    /** Remove emojis and special characters */
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    /** Normalize whitespace */
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract artist and track info from post text.
 * Uses common patterns like "Artist - Track" or "Track by Artist".
 * 
 * @param {string} text - Post text that may contain music info
 * @returns {{ artist: string|null, track: string|null, query: string }}
 *   Extracted info with fallback raw query
 * 
 * @example
 * extractMusicInfo("Check out Daft Punk - Around The World")
 * // Returns: { artist: "Daft Punk", track: "Around The World", query: "..." }
 */
function extractMusicInfo(text) {
  const cleaned = cleanTextForSearch(text);
  
  /**
   * Try common "Artist - Track" pattern first.
   * This is the most reliable format used in music posts.
   */
  const dashPattern = /^(.+?)\s*[-–—]\s*(.+)$/;
  const dashMatch = cleaned.match(dashPattern);
  
  if (dashMatch) {
    return {
      artist: dashMatch[1].trim(),
      track: dashMatch[2].trim(),
      query: cleaned
    };
  }
  
  /**
   * Try "Track by Artist" pattern as fallback.
   * Common in casual posts about music.
   */
  const byPattern = /^(.+?)\s+by\s+(.+)$/i;
  const byMatch = cleaned.match(byPattern);
  
  if (byMatch) {
    return {
      artist: byMatch[2].trim(),
      track: byMatch[1].trim(),
      query: cleaned
    };
  }
  
  /**
   * No pattern matched - return raw text as search query.
   * Spotify search is fuzzy enough to often find matches.
   */
  return {
    artist: null,
    track: null,
    query: cleaned
  };
}

/**
 * Process a Facebook post and extract music candidates.
 * Combines URL extraction and text parsing to build search queries.
 * 
 * @param {{ message?: string, story?: string, link?: string }} post - FB post object
 * @returns {Array<{ url: string|null, platform: string, spotifyTrackId: string|null, searchQuery: string, source: string }>}
 *   Array of music candidates to search for
 */
function extractMusicFromPost(post) {
  const candidates = [];
  const text = post.message || post.story || '';
  
  /** Extract URLs from post text */
  const urls = extractUrls(text);
  
  /** Also check for attached link */
  if (post.link && !urls.includes(post.link)) {
    urls.push(post.link);
  }
  
  /**
   * Process each URL found in the post.
   * Prioritize music platform URLs for better search accuracy.
   */
  for (const url of urls) {
    if (isMusicUrl(url)) {
      const platform = detectPlatform(url);
      const spotifyTrackId = platform === 'spotify' ? extractSpotifyTrackId(url) : null;
      
      /**
       * Build search query from post text.
       * The URL gives us context about what music is being shared.
       */
      const musicInfo = extractMusicInfo(text);
      
      candidates.push({
        url,
        platform,
        spotifyTrackId,
        searchQuery: musicInfo.query || text.substring(0, 100),
        artist: musicInfo.artist,
        track: musicInfo.track,
        source: 'url'
      });
    }
  }
  
  /**
   * If no music URLs found but post has text, treat as potential music mention.
   * Many posts just say "Check out this track: Artist - Song" without links.
   */
  if (candidates.length === 0 && text.length > 5) {
    const musicInfo = extractMusicInfo(text);
    
    if (musicInfo.artist || musicInfo.track || musicInfo.query.length > 10) {
      candidates.push({
        url: null,
        platform: 'text_only',
        spotifyTrackId: null,
        searchQuery: musicInfo.query,
        artist: musicInfo.artist,
        track: musicInfo.track,
        source: 'text'
      });
    }
  }
  
  return candidates;
}

/**
 * Process a single URL and extract music candidate info.
 * Used for processing manually submitted links.
 * 
 * @param {string} url - URL to process
 * @returns {Array<{ url: string, platform: string, spotifyTrackId: string|null, searchQuery: string, source: string }>}
 *   Array with single candidate if music URL, empty otherwise
 */
function extractMusicUrls(url) {
  if (!url || typeof url !== 'string') return [];
  
  // Clean the URL
  const cleanedUrl = url.trim().replace(/[.,;:!?)]+$/, '');
  
  if (!isMusicUrl(cleanedUrl)) {
    // Not a recognized music URL - still try to process it
    // in case it's a valid URL we just don't recognize the platform
    try {
      new URL(cleanedUrl);
      return [{
        url: cleanedUrl,
        platform: 'unknown',
        spotifyTrackId: null,
        searchQuery: cleanedUrl,
        artist: null,
        track: null,
        source: 'url'
      }];
    } catch {
      return [];
    }
  }
  
  const platform = detectPlatform(cleanedUrl);
  const spotifyTrackId = platform === 'spotify' ? extractSpotifyTrackId(cleanedUrl) : null;
  
  return [{
    url: cleanedUrl,
    platform,
    spotifyTrackId,
    searchQuery: cleanedUrl, // URL will be used as context
    artist: null,
    track: null,
    source: 'url'
  }];
}

module.exports = {
  extractUrls,
  isMusicUrl,
  detectPlatform,
  extractSpotifyTrackId,
  cleanTextForSearch,
  extractMusicInfo,
  extractMusicFromPost,
  extractMusicUrls
};
