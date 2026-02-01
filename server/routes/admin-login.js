/**
 * Admin Login Route Handler
 * Handles admin authentication and password change
 */

const db = require("../lib/supabase");
const { hashPassword, verifyPassword, validateUsername, validatePasswordFormat, validateStrongPassword } = require("../lib/crypto");
const { createToken, verifyAdminToken } = require("../lib/jwt");

/**
 * Handle admin login and password change
 * POST /functions/v1/admin-login
 */
async function handleAdminLogin(req, res) {
  const { username, password, action, currentPassword, newPassword } = req.body;
  
  // Get client IP for rate limiting
  const clientIP = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || 
                   req.headers["cf-connecting-ip"] || 
                   req.ip ||
                   "unknown";

  try {
    // Handle password change action
    if (action === "change_password") {
      const { valid, payload } = verifyAdminToken(req.headers);
      
      if (!valid) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      // Validate current password
      if (!validatePasswordFormat(currentPassword)) {
        return res.status(400).json({ success: false, error: "Current password is required" });
      }

      // Validate new password strength
      const passwordValidation = validateStrongPassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({ success: false, error: passwordValidation.error });
      }

      // Fetch admin user
      const users = await db.select("admin_users", `?id=eq.${encodeURIComponent(payload.sub)}&select=id,username,password_hash`);

      if (!users || users.length === 0) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const adminUser = users[0];

      // Verify current password
      const isCurrentValid = await verifyPassword(currentPassword, adminUser.password_hash);
      if (!isCurrentValid) {
        console.log("Password change failed - current password incorrect");
        return res.status(401).json({ success: false, error: "Current password is incorrect" });
      }

      // Hash new password with PBKDF2
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await db.update("admin_users", `?id=eq.${encodeURIComponent(payload.sub)}`, {
        password_hash: newPasswordHash,
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
      });

      console.log(`Password changed for admin: ${adminUser.username}`);

      // Log password change
      await db.log("admin", `Admin password changed: ${adminUser.username}`, {
        username: adminUser.username,
        timestamp: new Date().toISOString(),
      });

      // Issue new token
      const newToken = createToken({
        sub: adminUser.id,
        username: adminUser.username,
        role: "admin",
      });

      return res.json({ success: true, token: newToken, message: "Password changed successfully" });
    }

    // Handle login action
    // Input validation
    if (!validateUsername(username)) {
      console.log("Invalid username format");
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    if (!validatePasswordFormat(password)) {
      console.log("Invalid password format");
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    console.log("Admin login attempt:", username);

    // Check rate limiting before proceeding
    try {
      const isAllowed = await db.rpc("check_login_allowed", { p_username: username, p_ip: clientIP });
      if (!isAllowed) {
        console.log(`Rate limit exceeded for ${username} from ${clientIP}`);
        return res.status(429).json({ success: false, error: "Too many failed attempts. Please try again in 15 minutes." });
      }
    } catch (err) {
      console.error("Rate limit check failed:", err);
      // Continue anyway if rate limiting fails
    }

    // Fetch admin user from database
    const users = await db.select("admin_users", `?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash,must_change_password`);
    
    if (!users || users.length === 0) {
      console.log("Admin login failed - user not found");
      // Log failed attempt
      try {
        await db.rpc("log_login_attempt", { p_username: username, p_ip: clientIP, p_success: false });
      } catch (e) { /* ignore */ }
      // Simulate password check to prevent timing attacks
      await hashPassword("dummy_password_to_prevent_timing_attacks");
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const adminUser = users[0];
    
    // Verify password
    const isValid = await verifyPassword(password, adminUser.password_hash);

    if (!isValid) {
      console.log("Admin login failed - invalid password");
      // Log failed attempt
      try {
        await db.rpc("log_login_attempt", { p_username: username, p_ip: clientIP, p_success: false });
      } catch (e) { /* ignore */ }
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    // Log successful attempt
    try {
      await db.rpc("log_login_attempt", { p_username: username, p_ip: clientIP, p_success: true });
    } catch (e) { /* ignore */ }

    console.log("Admin login successful");

    // Create JWT token
    const token = createToken({
      sub: adminUser.id,
      username: adminUser.username,
      role: "admin",
    });

    // Log successful login
    await db.log("admin", `Admin login successful: ${username}`, {
      username,
      timestamp: new Date().toISOString(),
    });

    return res.json({ 
      success: true, 
      token,
      mustChangePassword: adminUser.must_change_password === true,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

module.exports = handleAdminLogin;
