/**
 * @fileoverview API endpoint to save configuration to MongoDB.
 * Receives form data from /pages/index.html and stores securely in Atlas.
 * 
 * POST /api/save-config
 * Body: { FB_TOKEN, GROUP_ID, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_USER_ID, SPOTIFY_REFRESH_TOKEN }
 */

const { saveConfig } = require('../lib/mongodb');

/**
 * Facebook config keys.
 */
const FACEBOOK_KEYS = ['FB_TOKEN', 'GROUP_ID'];

/**
 * Spotify config keys.
 */
const SPOTIFY_KEYS = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'SPOTIFY_USER_ID',
  'SPOTIFY_REFRESH_TOKEN'
];

/**
 * Validate a section (Facebook or Spotify) has all required fields.
 * 
 * @param {Object} data - Form data to validate
 * @param {string[]} keys - Keys to check
 * @returns {{ valid: boolean, missing: string[] }} Validation result
 */
function validateSection(data, keys) {
  const missing = keys.filter(key => !data[key] || data[key].trim() === '');
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
     * Determine which section to save based on 'section' field.
     * Supports: 'facebook', 'spotify', or 'all' (default for backwards compat).
     */
    const section = data.section || 'all';
    let keysToValidate = [];
    
    if (section === 'facebook') {
      keysToValidate = FACEBOOK_KEYS;
    } else if (section === 'spotify') {
      keysToValidate = SPOTIFY_KEYS;
    } else {
      keysToValidate = [...FACEBOOK_KEYS, ...SPOTIFY_KEYS];
    }

    /**
     * Validate the relevant section fields are present.
     */
    const validation = validateSection(data, keysToValidate);
    
    if (!validation.valid) {
      console.log('[SaveConfig] Validation failed, missing:', validation.missing);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${validation.missing.join(', ')}`
      });
    }

    /**
     * Build vars object with only the fields being saved.
     * Merge with existing config to preserve other section.
     */
    const { getConfig } = require('../lib/mongodb');
    const existingConfig = await getConfig('default');
    const existingVars = existingConfig?.vars || {};
    
    const vars = { ...existingVars };
    
    // Update only the fields provided
    keysToValidate.forEach(key => {
      if (data[key]) {
        vars[key] = data[key].trim();
      }
    });

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
