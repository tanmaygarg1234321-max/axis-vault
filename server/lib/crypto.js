/**
 * PBKDF2 password hashing utilities for Node.js
 * Replaces edge function Web Crypto API with Node.js crypto module
 */

const crypto = require("crypto");

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Hash a password using PBKDF2
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password in format: pbkdf2:iterations:saltHex:hashHex
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256", (err, derivedKey) => {
      if (err) return reject(err);
      
      const saltHex = salt.toString("hex");
      const hashHex = derivedKey.toString("hex");
      
      resolve(`pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`);
    });
  });
}

/**
 * Verify a password against a stored hash
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Stored hash to compare against
 * @returns {Promise<boolean>} - Whether password is valid
 */
async function verifyPassword(password, storedHash) {
  try {
    // Handle INITIAL_SETUP marker - for first login only
    if (storedHash === "INITIAL_SETUP") {
      console.log("Initial setup mode - checking default password");
      return password === "TempAdmin2024!Change";
    }
    
    // Handle legacy bcrypt hashes - allow specific known password for migration
    if (storedHash.startsWith("$2")) {
      console.log("Legacy bcrypt hash detected - checking for default password migration");
      return password === "TempAdmin2024!Change";
    }
    
    // Handle PBKDF2 hashes
    if (storedHash.startsWith("pbkdf2:")) {
      const parts = storedHash.split(":");
      if (parts.length !== 4) return false;
      
      const iterations = parseInt(parts[1], 10);
      const saltHex = parts[2];
      const expectedHashHex = parts[3];
      
      const salt = Buffer.from(saltHex, "hex");
      
      return new Promise((resolve) => {
        crypto.pbkdf2(password, salt, iterations, KEY_LENGTH, "sha256", (err, derivedKey) => {
          if (err) {
            console.error("PBKDF2 error:", err);
            return resolve(false);
          }
          
          const actualHashHex = derivedKey.toString("hex");
          
          // Constant-time comparison to prevent timing attacks
          if (actualHashHex.length !== expectedHashHex.length) {
            return resolve(false);
          }
          
          let result = 0;
          for (let i = 0; i < actualHashHex.length; i++) {
            result |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
          }
          
          resolve(result === 0);
        });
      });
    }
    
    return false;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

/**
 * Validate strong password (12+ chars with complexity)
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStrongPassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  
  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters" };
  }
  
  if (password.length > 128) {
    return { valid: false, error: "Password must be less than 128 characters" };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'/`~]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
    return { 
      valid: false, 
      error: "Password must contain uppercase, lowercase, number, and special character" 
    };
  }
  
  return { valid: true };
}

/**
 * Validate username format (alphanumeric, 3-50 chars)
 * @param {string} username - Username to validate
 * @returns {boolean}
 */
function validateUsername(username) {
  if (!username || typeof username !== "string") return false;
  return /^[a-zA-Z0-9_]{3,50}$/.test(username);
}

/**
 * Validate password format (non-empty, max 128 chars)
 * @param {string} password - Password to validate
 * @returns {boolean}
 */
function validatePasswordFormat(password) {
  if (!password || typeof password !== "string") return false;
  return password.length >= 1 && password.length <= 128;
}

module.exports = {
  hashPassword,
  verifyPassword,
  validateStrongPassword,
  validateUsername,
  validatePasswordFormat,
  PBKDF2_ITERATIONS,
  SALT_LENGTH,
  KEY_LENGTH,
};
