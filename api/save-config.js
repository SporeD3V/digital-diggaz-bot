/**
 * @fileoverview API endpoint to save configuration to MongoDB.
 * Receives form data from /pages/index.html and stores securely in Atlas.
 * 
 * POST /api/save-config
 * Body: { FB_TOKEN, GROUP_ID, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_USER_ID, SPOTIFY_REFRESH_TOKEN }
 */

const { saveConfig } = require('../lib/mongodb');

/**
 * List of required environment variable keys.
 * Used for validation before saving to database.
 */
const REQUIRED_KEYS = [
  'FB_TOKEN',
  'GROUP_ID',
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'SPOTIFY_USER_ID',
  'SPOTIFY_REFRESH_TOKEN'
];

/**
 * Validate that all required keys are present and non-empty.
 * 
 * @param {Object} data - Form data to validate
 * @returns {{ valid: boolean, missing: string[] }} Validation result
 */
function validateInput(data) {
  const missing = REQUIRED_KEYS.filter(key => !data[key] || data[key].trim() === '');
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Mask sensitive tokens for logging.
 * Shows first 4 and last 4 characters only.
 * 
 * @param {string} token - Token to mask
 * @returns {string} Masked token like "EAAb...xyz"
 */
function maskToken(token) {
  if (!token || token.length < 12) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Save configuration API handler.
 * Validates input, saves to MongoDB, returns success/error.
 * 
 * @param {Object} req - Vercel request object
 * @param {Object} res - Vercel response object
 */
module.exports = async function handler(req, res) {
  /**
   * Only allow POST requests.
   * GET would expose sensitive data in URL/logs.
   */
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  console.log('[SaveConfig] Received configuration request');

  try {
    /**
     * Parse request body.
     * Vercel automatically parses JSON when Content-Type is application/json.
     */
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body. Expected JSON object.'
      });
    }

    /**
     * Validate all required fields are present.
     * Return specific error message listing missing fields.
     */
    const validation = validateInput(data);
    
    if (!validation.valid) {
      console.log('[SaveConfig] Validation failed, missing:', validation.missing);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${validation.missing.join(', ')}`
      });
    }

    /**
     * Extract and trim all values.
     * Prevents whitespace issues from copy-paste.
     */
    const vars = {
      FB_TOKEN: data.FB_TOKEN.trim(),
      GROUP_ID: data.GROUP_ID.trim(),
      SPOTIFY_CLIENT_ID: data.SPOTIFY_CLIENT_ID.trim(),
      SPOTIFY_CLIENT_SECRET: data.SPOTIFY_CLIENT_SECRET.trim(),
      SPOTIFY_USER_ID: data.SPOTIFY_USER_ID.trim(),
      SPOTIFY_REFRESH_TOKEN: data.SPOTIFY_REFRESH_TOKEN.trim()
    };

    /**
     * Log masked tokens for debugging (never log full tokens!).
     */
    console.log('[SaveConfig] Saving config with tokens:', {
      FB_TOKEN: maskToken(vars.FB_TOKEN),
      GROUP_ID: vars.GROUP_ID,
      SPOTIFY_CLIENT_ID: maskToken(vars.SPOTIFY_CLIENT_ID),
      SPOTIFY_CLIENT_SECRET: maskToken(vars.SPOTIFY_CLIENT_SECRET),
      SPOTIFY_USER_ID: vars.SPOTIFY_USER_ID,
      SPOTIFY_REFRESH_TOKEN: maskToken(vars.SPOTIFY_REFRESH_TOKEN)
    });

    /**
     * Save to MongoDB Atlas.
     * Using 'default' as projectId for single-project setup.
     * Could be extended to support multiple projects later.
     */
    const result = await saveConfig('default', vars);

    console.log('[SaveConfig] Configuration saved successfully');

    return res.status(200).json({
      success: true,
      message: 'Configuration saved successfully',
      projectId: 'default',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    /**
     * Handle errors gracefully.
     * Log full error for debugging, return safe message to client.
     */
    console.error('[SaveConfig] Error:', error);

    /**
     * Check for MongoDB connection errors specifically.
     */
    if (error.message.includes('MONGODB_URI')) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured. Add MongoDB Atlas integration in Vercel.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to save configuration. Check server logs.'
    });
  }
};
