/**
 * @fileoverview Voting API endpoint
 * Handles Track of the Month voting with Vercel KV storage
 * 
 * POST /api/vote - Submit a vote
 * GET /api/vote - Get current vote counts
 * 
 * REQUIRES: @vercel/kv configured in Vercel project settings
 */

import { kv } from '@vercel/kv';

/**
 * Get the current month key for storing votes
 * Format: votes:YYYY-MM
 * 
 * @returns {string} Redis key for current month votes
 */
function getVoteKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `votes:${year}-${month}`;
}

/**
 * API handler for voting
 * 
 * POST: Submit vote { trackId, trackName, artists }
 * GET: Retrieve current vote counts
 * 
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 */
export default async function handler(req, res) {
  const voteKey = getVoteKey();

  // Handle GET - return current votes
  if (req.method === 'GET') {
    try {
      // Get all votes for current month
      const votes = await kv.hgetall(voteKey) || {};

      // Parse and sort by vote count
      const results = Object.entries(votes)
        .map(([trackId, data]) => {
          // Data is stored as JSON string
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          return {
            trackId,
            trackName: parsed.trackName,
            artists: parsed.artists,
            votes: parsed.votes || 0,
          };
        })
        .sort((a, b) => b.votes - a.votes);

      return res.status(200).json({ 
        month: voteKey.replace('votes:', ''),
        results,
      });

    } catch (error) {
      console.error('[Vote GET] Error:', error.message);
      
      // If KV not configured, return empty results
      if (error.message.includes('KV')) {
        return res.status(200).json({ 
          month: voteKey.replace('votes:', ''),
          results: [],
          notice: 'Voting not configured',
        });
      }

      return res.status(500).json({ error: 'Failed to get votes' });
    }
  }

  // Handle POST - submit vote
  if (req.method === 'POST') {
    try {
      const { trackId, trackName, artists } = req.body;

      // Validate required fields
      if (!trackId || !trackName) {
        return res.status(400).json({ 
          error: 'trackId and trackName required' 
        });
      }

      // Get current vote data for this track
      const existing = await kv.hget(voteKey, trackId);
      
      let voteData;
      if (existing) {
        // Increment existing votes
        const parsed = typeof existing === 'string' ? JSON.parse(existing) : existing;
        voteData = {
          trackName,
          artists: artists || parsed.artists,
          votes: (parsed.votes || 0) + 1,
        };
      } else {
        // First vote for this track
        voteData = {
          trackName,
          artists: artists || [],
          votes: 1,
        };
      }

      // Store updated vote
      await kv.hset(voteKey, { [trackId]: JSON.stringify(voteData) });

      // Set expiry for 60 days (clean up old votes)
      await kv.expire(voteKey, 60 * 24 * 60 * 60);

      return res.status(200).json({ 
        success: true,
        trackId,
        votes: voteData.votes,
      });

    } catch (error) {
      console.error('[Vote POST] Error:', error.message);

      // If KV not configured, return friendly error
      if (error.message.includes('KV')) {
        return res.status(503).json({ 
          error: 'Voting not available',
          message: 'Vercel KV not configured',
        });
      }

      return res.status(500).json({ error: 'Failed to submit vote' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}
