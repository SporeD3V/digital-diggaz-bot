/**
 * @fileoverview Test Spotify API connection.
 * Validates credentials by refreshing access token and fetching user profile.
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId, clientSecret, refreshToken } = req.body || {};

  if (!clientId || !clientSecret || !refreshToken) {
    return res.status(400).json({ 
      success: false, 
      error: 'Client ID, Secret, and Refresh Token required' 
    });
  }

  try {
    /**
     * Step 1: Get access token using refresh token
     */
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(200).json({
        success: false,
        message: tokenData.error_description || tokenData.error
      });
    }

    /**
     * Step 2: Fetch user profile to verify token works
     */
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const profileData = await profileResponse.json();

    if (profileData.error) {
      return res.status(200).json({
        success: false,
        message: profileData.error.message || 'Failed to fetch profile'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Connected as ${profileData.display_name || profileData.id}`
    });

  } catch (error) {
    console.error('[TestSpotify] Error:', error);
    return res.status(200).json({
      success: false,
      message: 'Connection failed'
    });
  }
};
