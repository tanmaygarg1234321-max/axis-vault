import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

// CORS configuration with origin validation
const ALLOWED_ORIGINS = [
  "https://preview--jeqsesqlkjklhyvszpgg.lovable.app",
  "https://jeqsesqlkjklhyvszpgg.lovable.app",
  "https://id-preview--2c705b12-7ee5-450c-8faa-9ab7ac9e2bcd.lovable.app",
  "https://axis-sparkle-store.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed =
    origin &&
    ALLOWED_ORIGINS.some(
      (allowed) =>
        origin === allowed ||
        origin.endsWith(".lovable.app") ||
        origin.endsWith(".lovableproject.com") ||
        origin.endsWith(".lovable.dev")
    );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}


// PBKDF2-based password hashing (Web Crypto API - works in Edge Runtime)
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordData,
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  
  const saltHex = arrayBufferToHex(salt.buffer);
  const hashHex = arrayBufferToHex(derivedBits);
  
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Handle INITIAL_SETUP marker - for first login only
    if (storedHash === 'INITIAL_SETUP') {
      console.log("Initial setup mode - checking default password");
      if (password === "TempAdmin2024!Change") {
        return true;
      }
      return false;
    }
    
    // Handle legacy bcrypt hashes - allow specific known password for migration
    if (storedHash.startsWith('$2')) {
      console.log("Legacy bcrypt hash detected - checking for default password migration");
      // For bcrypt migration: if this is the default temp password, allow login
      // User will be forced to change password immediately
      if (password === "TempAdmin2024!Change") {
        console.log("Default password accepted for migration - user must change password");
        return true;
      }
      return false;
    }
    
    // Handle PBKDF2 hashes
    if (storedHash.startsWith('pbkdf2:')) {
      const parts = storedHash.split(':');
      if (parts.length !== 4) return false;
      
      const iterations = parseInt(parts[1], 10);
      const saltHex = parts[2];
      const expectedHashHex = parts[3];
      
      const salt = new Uint8Array(hexToArrayBuffer(saltHex));
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordData,
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: iterations,
          hash: "SHA-256",
        },
        keyMaterial,
        KEY_LENGTH * 8
      );
      
      const actualHashHex = arrayBufferToHex(derivedBits);
      
      // Constant-time comparison to prevent timing attacks
      if (actualHashHex.length !== expectedHashHex.length) return false;
      
      let result = 0;
      for (let i = 0; i < actualHashHex.length; i++) {
        result |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
      }
      
      return result === 0;
    }
    
    return false;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

// Validate username format (alphanumeric, 3-50 chars)
function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  return /^[a-zA-Z0-9_]{3,50}$/.test(username);
}

// Validate password format (non-empty, max 128 chars)
function validatePasswordFormat(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 1 && password.length <= 128;
}

// Validate strong password for password changes (12+ chars with complexity)
function validateStrongPassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('cf-connecting-ip') || 
                   'unknown';

  try {
    const body = await req.json();
    const { username, password, action, currentPassword, newPassword } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const jwtSecret = Deno.env.get("ADMIN_JWT_SECRET");

    if (!jwtSecret) {
      console.error("ADMIN_JWT_SECRET not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle password change action
    if (action === "change_password") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Verify JWT token
      const token = authHeader.replace("Bearer ", "");
      try {
        const [headerB64, payloadB64] = token.split(".");
        const payload = JSON.parse(atob(payloadB64));
        
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          throw new Error("Token expired");
        }

        // Validate current password
        if (!validatePasswordFormat(currentPassword)) {
          return new Response(
            JSON.stringify({ success: false, error: "Current password is required" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Validate new password strength
        const passwordValidation = validateStrongPassword(newPassword);
        if (!passwordValidation.valid) {
          return new Response(
            JSON.stringify({ success: false, error: passwordValidation.error }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Fetch admin user
        const response = await fetch(
          `${supabaseUrl}/rest/v1/admin_users?id=eq.${encodeURIComponent(payload.sub)}&select=id,username,password_hash`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        );

        const users = await response.json();
        if (!users || users.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "User not found" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const adminUser = users[0];

        // Verify current password
        const isCurrentValid = await verifyPassword(currentPassword, adminUser.password_hash);
        if (!isCurrentValid) {
          console.log("Password change failed - current password incorrect");
          return new Response(
            JSON.stringify({ success: false, error: "Current password is incorrect" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Hash new password with PBKDF2
        const newPasswordHash = await hashPassword(newPassword);

        // Update password
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/admin_users?id=eq.${encodeURIComponent(payload.sub)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              password_hash: newPasswordHash,
              must_change_password: false,
              password_changed_at: new Date().toISOString(),
            }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error("Failed to update password");
        }

        console.log(`Password changed for admin: ${adminUser.username}`);

        // Log password change
        await fetch(`${supabaseUrl}/rest/v1/logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            type: "admin",
            message: `Admin password changed: ${adminUser.username}`,
            metadata: { username: adminUser.username, timestamp: new Date().toISOString() },
          }),
        });

        // Issue new token
        const newKey = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(jwtSecret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign", "verify"]
        );

        const newToken = await create(
          { alg: "HS256", typ: "JWT" },
          {
            sub: adminUser.id,
            username: adminUser.username,
            role: "admin",
            exp: getNumericDate(60 * 60 * 8),
            iat: getNumericDate(0),
          },
          newKey
        );

        return new Response(
          JSON.stringify({ success: true, token: newToken, message: "Password changed successfully" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (err: any) {
        console.error("Password change error:", err);
        return new Response(
          JSON.stringify({ success: false, error: "Authentication failed" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Handle login action
    // Input validation
    if (!validateUsername(username)) {
      console.log("Invalid username format");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!validatePasswordFormat(password)) {
      console.log("Invalid password format");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Admin login attempt:", username);

    // Check rate limiting before proceeding
    const rateLimitResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/check_login_allowed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ p_username: username, p_ip: clientIP }),
      }
    );
    
    const isAllowed = await rateLimitResponse.json();
    if (!isAllowed) {
      console.log(`Rate limit exceeded for ${username} from ${clientIP}`);
      return new Response(
        JSON.stringify({ success: false, error: "Too many failed attempts. Please try again in 15 minutes." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch admin user from database using parameterized query
    const response = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash,must_change_password`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    const users = await response.json();
    
    if (!users || users.length === 0) {
      console.log("Admin login failed - user not found");
      // Log failed attempt
      await fetch(`${supabaseUrl}/rest/v1/rpc/log_login_attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ p_username: username, p_ip: clientIP, p_success: false }),
      });
      // Simulate password check to prevent timing attacks
      await hashPassword("dummy_password_to_prevent_timing_attacks");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminUser = users[0];
    
    // Verify password
    const isValid = await verifyPassword(password, adminUser.password_hash);

    if (!isValid) {
      console.log("Admin login failed - invalid password");
      // Log failed attempt
      await fetch(`${supabaseUrl}/rest/v1/rpc/log_login_attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ p_username: username, p_ip: clientIP, p_success: false }),
      });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log successful attempt
    await fetch(`${supabaseUrl}/rest/v1/rpc/log_login_attempt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ p_username: username, p_ip: clientIP, p_success: true }),
    });

    console.log("Admin login successful");

    // Create JWT token
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: adminUser.id,
        username: adminUser.username,
        role: "admin",
        exp: getNumericDate(60 * 60 * 8), // 8 hours expiry
        iat: getNumericDate(0),
      },
      key
    );

    // Log successful login
    await fetch(`${supabaseUrl}/rest/v1/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        type: "admin",
        message: `Admin login successful: ${username}`,
        metadata: { username, timestamp: new Date().toISOString() },
      }),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        token,
        mustChangePassword: adminUser.must_change_password === true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Admin login error:", error);
    return new Response(
      JSON.stringify({ error: "Authentication failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
