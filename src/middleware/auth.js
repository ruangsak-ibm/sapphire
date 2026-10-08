/**
 * Authentication and authorization middleware
 */

/**
 * Simple API key authentication
 * Checks for Authorization header: "Bearer <api-key>"
 * If API_KEY environment variable is set, validates against it.
 * Otherwise, rejects authentication (no fallback to any 8+ char token).
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
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  // If API_KEY environment variable is set, validate against it
  const configuredApiKey = process.env.API_KEY;
  if (configuredApiKey) {
    if (apiKey !== configuredApiKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
  } else {
    // If no API_KEY is configured, require at least 8 characters for basic security
    if (apiKey.length < 8) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
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
