import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// CORS configuration with origin validation
const ALLOWED_ORIGINS = [
  "https://preview--jeqsesqlkjklhyvszpgg.lovable.app",
  "https://jeqsesqlkjklhyvszpgg.lovable.app",
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

// Verify admin JWT token using HS256 algorithm
async function verifyAdminToken(
  authHeader: string | null
): Promise<{ valid: boolean; payload?: any }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false };
  }

  const jwtSecret = Deno.env.get("ADMIN_JWT_SECRET");
  if (!jwtSecret) {
    console.error("ADMIN_JWT_SECRET not configured");
    return { valid: false };
  }

  const b64UrlToB64 = (str: string) => {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    return base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  };

  const b64UrlToString = (str: string) => atob(b64UrlToB64(str));

  const b64UrlToUint8Array = (str: string) =>
    Uint8Array.from(b64UrlToString(str), (c) => c.charCodeAt(0));

  try {
    const token = authHeader.slice("Bearer ".length);
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token format");

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(b64UrlToString(headerB64));
    if (header?.alg !== "HS256") {
      throw new Error(`Unexpected algorithm: ${header?.alg}`);
    }

    const payload = JSON.parse(b64UrlToString(payloadB64));

    // Check expiration
    if (payload?.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired");
    }

    if (payload?.role !== "admin") {
      return { valid: false };
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureInput = `${headerB64}.${payloadB64}`;
    const signature = b64UrlToUint8Array(signatureB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(signatureInput)
    );

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    return { valid: true, payload };
  } catch (err) {
    console.error("Token verification failed:", err);
    return { valid: false };
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify admin authentication
  const authHeader = req.headers.get("authorization");
  const { valid, payload } = await verifyAdminToken(authHeader);

  if (!valid) {
    console.log("Unauthorized admin data access attempt");
    return new Response(
      JSON.stringify({ error: "Unauthorized - invalid or missing admin token" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  console.log("Admin data request authenticated:", payload?.username);

  try {
    const { dataType } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Admin fetching data type:", dataType);

    let endpoint = "";
    switch (dataType) {
      case "orders":
        endpoint = "/rest/v1/orders?select=*&order=created_at.desc&limit=500";
        break;
      case "logs":
        endpoint = "/rest/v1/logs?select=*&order=created_at.desc&limit=500";
        break;
      case "coupons":
        endpoint = "/rest/v1/coupons?select=*&order=created_at.desc";
        break;
      case "settings":
        endpoint = "/rest/v1/site_settings?select=*";
        break;
      case "all":
        // Fetch all data types in parallel
        const [ordersRes, logsRes, couponsRes, settingsRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc&limit=500`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }),
          fetch(`${supabaseUrl}/rest/v1/logs?select=*&order=created_at.desc&limit=500`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }),
          fetch(`${supabaseUrl}/rest/v1/coupons?select=*&order=created_at.desc`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }),
          fetch(`${supabaseUrl}/rest/v1/site_settings?select=*`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }),
        ]);

        const [orders, logs, coupons, settings] = await Promise.all([
          ordersRes.json(),
          logsRes.json(),
          couponsRes.json(),
          settingsRes.json(),
        ]);

        return new Response(
          JSON.stringify({
            success: true,
            data: { orders, logs, coupons, settings },
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      default:
        return new Response(
          JSON.stringify({ error: "Invalid data type requested" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    // Single data type fetch
    const response = await fetch(`${supabaseUrl}${endpoint}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${dataType}: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Admin data fetch error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to fetch admin data" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
