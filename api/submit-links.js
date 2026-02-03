/**
 * @fileoverview API endpoint for manual music link submission.
 * Accepts a list of music links and stores them in MongoDB for playlist generation.
 * 
 * POST /api/submit-links
 * Body: { links: string[], month?: string }
 * 
 * Links can be from: YouTube, SoundCloud, Spotify, Bandcamp, Apple Music, Tidal, Deezer
 */

const { connectToDatabase } = require('../lib/mongodb');

/**
 * Collection name for storing submitted links.
 */
const LINKS_COLLECTION = 'submitted_links';

/**
 * Get current month in YYYY-MM format.
 * Used as default batch identifier.
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
 * Extract and validate music links from raw text.
 * Supports multiple formats: one per line, comma-separated, or space-separated.
 * 
 * @param {string|string[]} input - Raw links input
 * @returns {string[]} Array of valid URLs
 */
function parseLinks(input) {
  let raw = input;
  
  // Handle array input
  if (Array.isArray(input)) {
    raw = input.join('\n');
  }
  
  // Split by newlines, commas, or spaces
  const parts = raw
    .split(/[\n,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Filter to only valid URLs
  const urls = parts.filter(part => {
    try {
      const url = new URL(part);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  });
  
  return [...new Set(urls)]; // Deduplicate
}

/**
 * Submit links API handler.
 * Stores submitted links in MongoDB for later playlist generation.
 * 
 * @param {Object} req - Vercel request object
 * @param {Object} res - Vercel response object
 */
module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  console.log('[SubmitLinks] Received submission request');

  try {
    const { links, month } = req.body || {};

    if (!links) {
      return res.status(400).json({
        success: false,
        error: 'No links provided. Send { links: "..." } or { links: [...] }'
      });
    }

    // Parse and validate links
    const parsedLinks = parseLinks(links);

    if (parsedLinks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid URLs found in submission'
      });
    }

    // Determine target month (default: current month)
    const targetMonth = month || getCurrentMonth();

    // Connect to database
    const db = await connectToDatabase();
    const collection = db.collection(LINKS_COLLECTION);

    // Find or create document for this month
    const existing = await collection.findOne({ month: targetMonth });
    
    let newLinks = [];
    let duplicates = 0;

    if (existing) {
      // Add only new links (avoid duplicates)
      const existingSet = new Set(existing.links || []);
      newLinks = parsedLinks.filter(link => {
        if (existingSet.has(link)) {
          duplicates++;
          return false;
        }
        return true;
      });

      if (newLinks.length > 0) {
        await collection.updateOne(
          { month: targetMonth },
          {
            $push: { links: { $each: newLinks } },
            $set: { updatedAt: new Date().toISOString() }
          }
        );
      }
    } else {
      // Create new document for this month
      newLinks = parsedLinks;
      await collection.insertOne({
        month: targetMonth,
        links: newLinks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const totalLinks = (existing?.links?.length || 0) + newLinks.length;

    console.log(`[SubmitLinks] Added ${newLinks.length} links for ${targetMonth} (${duplicates} duplicates skipped)`);

    return res.status(200).json({
      success: true,
      message: `Added ${newLinks.length} new links${duplicates > 0 ? ` (${duplicates} duplicates skipped)` : ''}`,
      month: targetMonth,
      added: newLinks.length,
      duplicatesSkipped: duplicates,
      totalLinks
    });

  } catch (error) {
    console.error('[SubmitLinks] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save links. Check server logs.'
    });
  }
};
