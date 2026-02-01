/**
 * Input validation utilities
 */

/**
 * Validate Minecraft username (3-16 chars, alphanumeric + underscore)
 * @param {string} username 
 * @returns {boolean}
 */
function validateMinecraftUsername(username) {
  if (!username || typeof username !== "string") return false;
  return /^[a-zA-Z0-9_]{3,16}$/.test(username);
}

/**
 * Validate Discord username (2-32 chars, no special chars)
 * @param {string} username 
 * @returns {boolean}
 */
function validateDiscordUsername(username) {
  if (!username || typeof username !== "string") return false;
  return username.length >= 2 && username.length <= 32 && !/[<>@#:```]/.test(username);
}

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
function validateEmail(email) {
  if (!email) return true; // Email is optional
  if (typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Sanitize string for safe storage
 * @param {string} input 
 * @param {number} maxLength 
 * @returns {string}
 */
function sanitizeInput(input, maxLength = 100) {
  if (!input || typeof input !== "string") return "";
  return input.trim().substring(0, maxLength);
}

/**
 * Sanitize string for RCON command
 * @param {string} input 
 * @returns {string}
 */
function sanitizeForRCON(input) {
  if (!input || typeof input !== "string") return "";
  return input.replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * Sanitize rank name for RCON
 * @param {string} rankName 
 * @returns {string}
 */
function sanitizeRankName(rankName) {
  if (!rankName || typeof rankName !== "string") return "";
  return sanitizeForRCON(rankName.replace(/ Rank$/i, "").toLowerCase());
}

module.exports = {
  validateMinecraftUsername,
  validateDiscordUsername,
  validateEmail,
  sanitizeInput,
  sanitizeForRCON,
  sanitizeRankName,
};
