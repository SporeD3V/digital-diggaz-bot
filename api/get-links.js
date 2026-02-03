/**
 * @fileoverview API endpoint to retrieve submitted links.
 * Returns links for a specific month or the current month.
 * 
 * GET /api/get-links?month=2026-02
 */

const { connectToDatabase } = require('../lib/mongodb');

/**
 * Collection name for storing submitted links.
 */
const LINKS_COLLECTION = 'submitted_links';

/**
 * Get current month in YYYY-MM format.
 * 
 * @returns {string} Current month like "2026-02"
 */
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get links API handler.
 * 
 * @param {Object} req - Vercel request object
 * @param {Object} res - Vercel response object
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const targetMonth = req.query.month || getCurrentMonth();

    const db = await connectToDatabase();
    const collection = db.collection(LINKS_COLLECTION);

    const doc = await collection.findOne({ month: targetMonth });

    if (!doc) {
      return res.status(200).json({
        success: true,
        month: targetMonth,
        links: [],
        count: 0
      });
    }

    return res.status(200).json({
      success: true,
      month: targetMonth,
      links: doc.links || [],
      count: (doc.links || []).length,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });

  } catch (error) {
    console.error('[GetLinks] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve links'
    });
  }
};
