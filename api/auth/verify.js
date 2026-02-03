/**
 * @fileoverview Token verification endpoint.
 */

const { validTokens } = require('./login');

module.exports = async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);

  if (!validTokens.has(token)) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  return res.status(200).json({ valid: true });
};
