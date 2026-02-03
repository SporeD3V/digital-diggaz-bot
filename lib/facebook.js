/**
 * @fileoverview DEPRECATED - Facebook Graph API client.
 * 
 * NOTE: Facebook Groups API was deprecated and no longer allows reading
 * group feeds via Graph API. This file is kept for reference only.
 * The bot now uses manual link submission instead of automatic FB scraping.
 * 
 * @deprecated Since Feb 2026 - Facebook Groups API no longer accessible
 */

const { toUnixTimestamp } = require('./date-utils');

/**
 * Facebook Graph API base URL.
 * Using v18.0 for stability - update as needed for new features.
 * @type {string}
 */
const FB_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Maximum posts to fetch per page (Facebook's limit is 100).
 * Lower values = more requests but less memory; higher = fewer requests.
 * @type {number}
 */
const POSTS_PER_PAGE = 100;

/**
 * Maximum pages to fetch to prevent runaway pagination.
 * Safety limit: 50 pages × 100 posts = 5000 posts max per run.
 * @type {number}
 */
const MAX_PAGES = 50;

/**
 * Delay between paginated requests to avoid rate limiting.
 * Facebook allows ~200 calls/hour for user tokens.
 * @type {number}
 */
const REQUEST_DELAY_MS = 500;

/**
 * Sleep helper for rate limiting between API calls.
 * 
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch a single page of group posts from Facebook Graph API.
 * Includes error handling for common API errors.
 * 
 * @param {string} url - Full Graph API URL to fetch
 * @param {string} accessToken - Facebook access token
 * @returns {Promise<{ data: Array, paging?: { next?: string } }>}
 *   Posts array and optional next page URL
 * @throws {Error} On API errors or network failures
 */
async function fetchPage(url, accessToken) {
  /**
   * Append access token to URL.
   * Using URL params instead of headers for Graph API compatibility.
   */
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}access_token=${accessToken}`;
  
  const response = await fetch(fullUrl);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Facebook] API error:', response.status, errorBody);
    
    /**
     * Handle specific error codes with actionable messages.
     * These help diagnose token/permission issues.
     */
    if (response.status === 400) {
      throw new Error(`Facebook API bad request: ${errorBody}`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Facebook token expired or lacks permissions. Regenerate FB_TOKEN.');
    }
    if (response.status === 429) {
      throw new Error('Facebook rate limit hit. Try again later.');
    }
    
    throw new Error(`Facebook API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch all posts from a Facebook group within a date range.
 * Handles pagination automatically, respecting rate limits.
 * 
 * @param {{
 *   groupId: string,
 *   accessToken: string,
 *   startDate: Date,
 *   endDate: Date
 * }} options - Fetch configuration
 * @returns {Promise<Array<{
 *   id: string,
 *   message?: string,
 *   story?: string,
 *   link?: string,
 *   created_time: string
 * }>>} Array of posts within the date range
 * 
 * @example
 * const posts = await fetchGroupPosts({
 *   groupId: '123456789',
 *   accessToken: 'EAABc...',
 *   startDate: new Date('2026-01-01'),
 *   endDate: new Date('2026-01-31')
 * });
 */
async function fetchGroupPosts({ groupId, accessToken, startDate, endDate }) {
  const allPosts = [];
  let pageCount = 0;
  
  /**
   * Build initial URL with time filters.
   * 'since' and 'until' use Unix timestamps for precision.
   * Request message, link, story, and created_time fields.
   */
  const since = toUnixTimestamp(startDate);
  const until = toUnixTimestamp(endDate);
  
  let url = `${FB_API_BASE}/${groupId}/feed?` +
    `fields=id,message,story,link,created_time,attachments{url,media}` +
    `&since=${since}&until=${until}&limit=${POSTS_PER_PAGE}`;
  
  console.log(`[Facebook] Fetching posts from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  /**
   * Paginate through all results.
   * Facebook returns a 'next' URL in paging object if more pages exist.
   */
  while (url && pageCount < MAX_PAGES) {
    pageCount++;
    console.log(`[Facebook] Fetching page ${pageCount}...`);
    
    try {
      const response = await fetchPage(url, accessToken);
      
      if (response.data && response.data.length > 0) {
        allPosts.push(...response.data);
        console.log(`[Facebook] Page ${pageCount}: ${response.data.length} posts (total: ${allPosts.length})`);
      }
      
      /**
       * Get next page URL or exit loop.
       * Facebook's cursor-based pagination handles the offset automatically.
       */
      url = response.paging?.next || null;
      
      /** Rate limit protection between pages */
      if (url) {
        await sleep(REQUEST_DELAY_MS);
      }
      
    } catch (error) {
      console.error(`[Facebook] Error on page ${pageCount}:`, error.message);
      
      /**
       * On error, return what we have so far rather than failing completely.
       * Partial results are better than no results for playlist generation.
       */
      if (allPosts.length > 0) {
        console.log(`[Facebook] Returning ${allPosts.length} posts collected before error`);
        break;
      }
      throw error;
    }
  }
  
  if (pageCount >= MAX_PAGES) {
    console.warn(`[Facebook] Hit max page limit (${MAX_PAGES}). Some posts may be missed.`);
  }
  
  console.log(`[Facebook] Total posts fetched: ${allPosts.length}`);
  return allPosts;
}

/**
 * Validate that the Facebook token and group ID are configured.
 * Call this early to fail fast with helpful error messages.
 * 
 * @param {string} groupId - Facebook group ID
 * @param {string} accessToken - Facebook access token
 * @throws {Error} If configuration is missing
 */
function validateConfig(groupId, accessToken) {
  if (!groupId) {
    throw new Error('GROUP_ID environment variable is required');
  }
  if (!accessToken) {
    throw new Error('FB_TOKEN environment variable is required');
  }
}

module.exports = {
  fetchGroupPosts,
  validateConfig,
  FB_API_BASE
};
