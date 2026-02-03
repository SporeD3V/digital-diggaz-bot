/**
 * @fileoverview Admin login endpoint.
 * Validates password and returns a session token.
 */

const crypto = require('crypto');

/**
 * Generate a simple session token.
 * In production, use a proper JWT library.
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Simple in-memory token store.
 * In production, use Redis or database.
 */
const validTokens = new Set();

/**
 * Export token store for verification endpoint.
 */
module.exports.validTokens = validTokens;

/**
 * Login handler - validates password and returns token.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  /**
   * Check against ADMIN_PASSWORD environment variable.
   * Set this in Vercel dashboard or .env file.
   */
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[Auth] ADMIN_PASSWORD not configured');
    return res.status(500).json({ error: 'Authentication not configured' });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = generateToken();
  validTokens.add(token);

  /**
   * Clean up old tokens after 24 hours.
   */
  setTimeout(() => {
    validTokens.delete(token);
  }, 24 * 60 * 60 * 1000);

  return res.status(200).json({ token });
};
