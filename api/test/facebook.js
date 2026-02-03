/**
 * @fileoverview Test Facebook API connection.
 * Validates group ID and access token by fetching group info.
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { groupId, token } = req.body || {};

  if (!groupId || !token) {
    return res.status(400).json({ 
      success: false, 
      error: 'Group ID and token required' 
    });
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${groupId}?fields=name,member_count&access_token=${token}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(200).json({
        success: false,
        message: data.error.message || 'Invalid credentials'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Connected to "${data.name}" (${data.member_count || '?'} members)`
    });

  } catch (error) {
    console.error('[TestFacebook] Error:', error);
    return res.status(200).json({
      success: false,
      message: 'Connection failed'
    });
  }
};
