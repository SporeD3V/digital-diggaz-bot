/**
 * @fileoverview Read-only status endpoint for debugging.
 * Returns high-level health info without exposing secrets.
 * 
 * GET /api/status
 * 
 * Use this to quickly check if:
 * - MongoDB is connected
 * - Facebook config exists
 * - Spotify config exists
 * - When the next cron job will run
 */

const { connectToDatabase, getConfig } = require('../lib/mongodb');

/**
 * Calculate a human-readable description of the next cron run.
 * The cron is set to run at 00:00 UTC on the 1st of each month.
 * 
 * @returns {string} Description like "in 5 days (March 1, 2026 at 00:00 UTC)"
 */
function getNextCronDescription() {
  const now = new Date();
  
  /**
   * Calculate next 1st of month at 00:00 UTC.
   * If today is the 1st and it's before midnight UTC, it runs today.
   * Otherwise, it's next month's 1st.
   */
  let nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  
  /**
   * If we're on the 1st and before midnight UTC, the run is today
   */
  if (now.getUTCDate() === 1 && now.getUTCHours() < 0) {
    nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  }
  
  /**
   * Calculate days until next run
   */
  const msUntil = nextRun.getTime() - now.getTime();
  const daysUntil = Math.ceil(msUntil / (1000 * 60 * 60 * 24));
  
  /**
   * Format the date nicely
   */
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[nextRun.getUTCMonth()];
  const day = nextRun.getUTCDate();
  const year = nextRun.getUTCFullYear();
  
  /**
   * Build description string
   */
  if (daysUntil === 0) {
    return `Today (${monthName} ${day}, ${year} at 00:00 UTC)`;
  } else if (daysUntil === 1) {
    return `Tomorrow (${monthName} ${day}, ${year} at 00:00 UTC)`;
  } else {
    return `In ${daysUntil} days (${monthName} ${day}, ${year} at 00:00 UTC)`;
  }
}

/**
 * Check if a config object has all required Facebook fields.
 * Does NOT check if the values are valid, just if they exist.
 * 
 * @param {Object} vars - Config vars object from MongoDB
 * @returns {boolean} True if FB config looks complete
 */
function hasFacebookConfig(vars) {
  if (!vars) return false;
  return !!(vars.GROUP_ID && vars.FB_TOKEN);
}

/**
 * Check if a config object has all required Spotify fields.
 * Does NOT check if the values are valid, just if they exist.
 * 
 * @param {Object} vars - Config vars object from MongoDB
 * @returns {boolean} True if Spotify config looks complete
 */
function hasSpotifyConfig(vars) {
  if (!vars) return false;
  return !!(
    vars.SPOTIFY_CLIENT_ID &&
    vars.SPOTIFY_CLIENT_SECRET &&
    vars.SPOTIFY_USER_ID &&
    vars.SPOTIFY_REFRESH_TOKEN
  );
}

/**
 * Status endpoint handler.
 * Returns JSON with connection and config status.
 * 
 * @param {Object} req - Vercel request object
 * @param {Object} res - Vercel response object
 */
module.exports = async function handler(req, res) {
  /**
   * Only allow GET requests for this read-only endpoint
   */
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  /**
   * Build the status response object
   */
  const status = {
    timestamp: new Date().toISOString(),
    hasMongoConnection: false,
    hasFacebookConfig: false,
    hasSpotifyConfig: false,
    nextCronRunDescription: getNextCronDescription(),
    lastRunSummary: null
  };

  try {
    /**
     * Step 1: Try to connect to MongoDB
     * If this succeeds, we know the connection works
     */
    await connectToDatabase();
    status.hasMongoConnection = true;
    console.log('[Status] MongoDB connection: OK');

    /**
     * Step 2: Check if config exists in database
     * We look for the 'default' project config
     */
    const config = await getConfig('default');
    
    if (config && config.vars) {
      status.hasFacebookConfig = hasFacebookConfig(config.vars);
      status.hasSpotifyConfig = hasSpotifyConfig(config.vars);
      
      /**
       * If there's a lastRun field stored, include a summary
       * (This would be set by generate-playlist.js if we add that feature)
       */
      if (config.lastRun) {
        status.lastRunSummary = {
          date: config.lastRun.date,
          success: config.lastRun.success,
          tracksAdded: config.lastRun.tracksAdded || 0,
          playlistUrl: config.lastRun.playlistUrl || null
        };
      }
    }

    console.log('[Status] Facebook config:', status.hasFacebookConfig ? 'OK' : 'Missing');
    console.log('[Status] Spotify config:', status.hasSpotifyConfig ? 'OK' : 'Missing');

  } catch (error) {
    /**
     * If MongoDB connection fails, log the error but don't expose details
     */
    console.error('[Status] Error:', error.message);
    
    /**
     * Check if it's specifically a MongoDB connection error
     */
    if (error.message.includes('MONGODB_URI')) {
      status.hasMongoConnection = false;
    }
  }

  /**
   * Return the status object
   * All sensitive info is kept out - only booleans and descriptions
   */
  return res.status(200).json(status);
};
