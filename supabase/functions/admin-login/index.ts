import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate username format (alphanumeric, 3-50 chars)
function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  return /^[a-zA-Z0-9_]{3,50}$/.test(username);
}

// Validate password (non-empty, max 128 chars)
function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 1 && password.length <= 128;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    // Input validation
    if (!validateUsername(username)) {
      console.log("Invalid username format");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!validatePassword(password)) {
      console.log("Invalid password format");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Admin login attempt:", username);

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

    // Fetch admin user from database using parameterized query
    const response = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash`,
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
      // Use constant-time comparison simulation to prevent timing attacks
      await bcrypt.compare("dummy_password", "$2a$10$dummyhashtopreventtimingattacks");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminUser = users[0];
    
    // Verify password using bcrypt
    const isValid = await bcrypt.compare(password, adminUser.password_hash);

    if (!isValid) {
      console.log("Admin login failed - invalid password");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
      JSON.stringify({ success: true, token }),
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
