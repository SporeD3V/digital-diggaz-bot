/**
 * @fileoverview Admin API endpoint to view stored configuration.
 * Provides read access to config metadata and optionally full config.
 * 
 * GET /api/admin - List all configs (metadata only)
 * GET /api/admin?projectId=default&showSecrets=true - Get full config (requires auth)
 */

const { getConfig, listConfigs } = require('../lib/mongodb');

/**
 * Simple auth check using ADMIN_SECRET env var.
 * WHY: Prevent unauthorized access to sensitive tokens.
 * 
 * @param {Object} req - Request object
 * @returns {boolean} True if authorized
 */
function isAuthorized(req) {
  const adminSecret = process.env.ADMIN_SECRET;
  
  /**
   * If no ADMIN_SECRET is set, deny all secret access.
   * This is a security safeguard.
   */
  if (!adminSecret) {
    return false;
  }

  /**
   * Check Authorization header for Bearer token.
   * Format: "Authorization: Bearer YOUR_ADMIN_SECRET"
   */
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  
  return token === adminSecret;
}

/**
 * Mask sensitive values in config for safe display.
 * Shows structure without exposing actual tokens.
 * 
 * @param {Object} vars - Config vars object
 * @returns {Object} Masked vars
 */
function maskSecrets(vars) {
  if (!vars) return null;
  
  const masked = {};
  
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === 'string' && value.length > 8) {
      /**
       * Show first 4 and last 4 characters.
       * Enough to verify correct token without exposing it.
       */
      masked[key] = `${value.slice(0, 4)}...${value.slice(-4)}`;
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

/**
 * Admin API handler.
 * Returns config metadata or full config based on auth.
 * 
 * @param {Object} req - Vercel request object
 * @param {Object} res - Vercel response object
 */
module.exports = async function handler(req, res) {
  /**
   * Only allow GET requests.
   */
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }

  console.log('[Admin] Config request received');

  try {
    const { projectId, showSecrets } = req.query;

    /**
     * If specific projectId requested, return that config.
     * Otherwise, list all configs (metadata only).
     */
    if (projectId) {
      const config = await getConfig(projectId);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: `Config not found for project: ${projectId}`
        });
      }

      /**
       * Only show full secrets if:
       * 1. showSecrets=true in query
       * 2. User is authorized via ADMIN_SECRET
       */
      const wantsSecrets = showSecrets === 'true';
      const authorized = isAuthorized(req);

      if (wantsSecrets && !authorized) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized. Provide valid ADMIN_SECRET in Authorization header.'
        });
      }

      return res.status(200).json({
        success: true,
        config: {
          projectId: config.projectId,
          vars: wantsSecrets && authorized ? config.vars : maskSecrets(config.vars),
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          secretsVisible: wantsSecrets && authorized
        }
      });
    }

    /**
     * No projectId specified - list all configs (metadata only).
     * Never expose tokens in list view.
     */
    const configs = await listConfigs();

    return res.status(200).json({
      success: true,
      configs,
      count: configs.length
    });

  } catch (error) {
    console.error('[Admin] Error:', error);

    if (error.message.includes('MONGODB_URI')) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured. Add MongoDB Atlas integration.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration.'
    });
  }
};
