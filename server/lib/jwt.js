/**
 * JWT utilities for Node.js
 * Uses jsonwebtoken package for HS256 signing/verification
 */

const jwt = require("jsonwebtoken");

const jwtSecret = () => process.env.ADMIN_JWT_SECRET;

/**
 * Create a JWT token
 * @param {object} payload - Token payload
 * @param {number} expiresInSeconds - Token expiry in seconds (default: 8 hours)
 * @returns {string} - JWT token
 */
function createToken(payload, expiresInSeconds = 60 * 60 * 8) {
  const secret = jwtSecret();
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET not configured");
  }
  
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: expiresInSeconds,
  });
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {{ valid: boolean, payload?: object }} - Verification result
 */
function verifyToken(token) {
  const secret = jwtSecret();
  if (!secret) {
    console.error("ADMIN_JWT_SECRET not configured");
    return { valid: false };
  }
  
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });
    
    // Check for admin role
    if (payload.role !== "admin") {
      return { valid: false };
    }
    
    return { valid: true, payload };
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return { valid: false };
  }
}

/**
 * Extract and verify admin token from request headers
 * Checks both x-admin-token header and Authorization header
 * @param {object} headers - Request headers
 * @returns {{ valid: boolean, payload?: object }}
 */
function verifyAdminToken(headers) {
  // Prefer x-admin-token header over Authorization
  const adminTokenHeader = headers["x-admin-token"];
  const authHeader = headers["authorization"];
  
  const tokenFromAdminHeader = adminTokenHeader
    ? (adminTokenHeader.startsWith("Bearer ")
        ? adminTokenHeader.slice("Bearer ".length)
        : adminTokenHeader)
    : null;
  const tokenFromAuthHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  
  const token = tokenFromAdminHeader || tokenFromAuthHeader;
  
  if (!token) {
    return { valid: false };
  }
  
  return verifyToken(token);
}

module.exports = {
  createToken,
  verifyToken,
  verifyAdminToken,
};
