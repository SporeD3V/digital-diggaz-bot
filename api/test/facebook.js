/**
 * @fileoverview DEPRECATED - Facebook API test endpoint.
 * 
 * NOTE: Facebook Groups API was deprecated and no longer allows reading
 * group feeds. This endpoint now returns a deprecation notice.
 * 
 * @deprecated Since Feb 2026 - Facebook Groups API no longer accessible
 */

module.exports = async function handler(req, res) {
  return res.status(200).json({
    success: false,
    deprecated: true,
    message: 'Facebook Groups API is deprecated. Use manual link submission instead.'
  });
};
