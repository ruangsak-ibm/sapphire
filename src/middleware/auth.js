/**
 * Authentication and authorization middleware
 */

/**
 * Simple API key authentication
 * Checks for Authorization header: "Bearer <api-key>"
 * For production, use more robust authentication mechanisms
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Use Authorization: Bearer <api-key> header.'
    });
  }

  const apiKey = authHeader.substring(7);
  
  // Simple validation: check if API key is provided and not empty
  // For production, validate against a database or secret storage
  if (!apiKey || apiKey.length < 8) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  // Attach user/client info to request for logging
  req.clientKey = apiKey;
  next();
}

/**
 * Optional authentication - allows both authenticated and unauthenticated requests
 * Used for health check and documentation endpoints
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    if (apiKey && apiKey.length >= 8) {
      req.clientKey = apiKey;
    }
  }
  
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
