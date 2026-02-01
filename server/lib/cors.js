/**
 * CORS configuration and middleware
 */

const ALLOWED_ORIGINS = [
  "https://preview--jeqsesqlkjklhyvszpgg.lovable.app",
  "https://jeqsesqlkjklhyvszpgg.lovable.app",
  "https://id-preview--2c705b12-7ee5-450c-8faa-9ab7ac9e2bcd.lovable.app",
  "https://axis-sparkle-store.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

/**
 * Check if origin is allowed
 * @param {string} origin 
 * @returns {boolean}
 */
function isOriginAllowed(origin) {
  if (!origin) return true; // Allow requests without origin (same-origin, curl, etc.)
  
  return ALLOWED_ORIGINS.some(
    (allowed) =>
      origin === allowed ||
      origin.endsWith(".lovable.app") ||
      origin.endsWith(".lovableproject.com") ||
      origin.endsWith(".lovable.dev")
  );
}

/**
 * Get CORS headers for response
 * @param {string} origin 
 * @returns {object}
 */
function getCorsHeaders(origin) {
  const isAllowed = isOriginAllowed(origin);
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin || "*") : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-admin-token, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

/**
 * CORS middleware for Express
 */
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const corsHeaders = getCorsHeaders(origin);
  
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  
  next();
}

module.exports = {
  ALLOWED_ORIGINS,
  isOriginAllowed,
  getCorsHeaders,
  corsMiddleware,
};
