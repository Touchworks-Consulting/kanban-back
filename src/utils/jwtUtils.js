const jwt = require('jsonwebtoken');

/**
 * Gets the JWT secret from environment variables
 * Throws error if not set to prevent security issues
 */
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be set in environment variables for security');
  }
  return secret;
}

/**
 * Signs a JWT token with proper error handling
 * @param {Object} payload - Token payload
 * @param {Object} options - JWT options (expiresIn, etc.)
 */
function signToken(payload, options = { expiresIn: '24h' }) {
  try {
    return jwt.sign(payload, getJWTSecret(), options);
  } catch (error) {
    throw new Error('Failed to sign JWT token: ' + error.message);
  }
}

/**
 * Verifies a JWT token with proper error handling
 * @param {string} token - Token to verify
 * @param {Object} options - JWT options (ignoreExpiration, etc.)
 */
function verifyToken(token, options = {}) {
  try {
    return jwt.verify(token, getJWTSecret(), options);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed: ' + error.message);
  }
}

module.exports = {
  getJWTSecret,
  signToken,
  verifyToken
};