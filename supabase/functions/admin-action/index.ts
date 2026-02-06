import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Helper function to convert hex to ArrayBuffer
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

// Helper function to convert ArrayBuffer to hex
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// PBKDF2 password verification (compatible with admin-login format: pbkdf2:iterations:saltHex:hashHex)
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Handle INITIAL_SETUP case
    if (storedHash === 'INITIAL_SETUP') {
      return password === 'TempAdmin2024!Change';
    }
    
    // Handle legacy bcrypt hashes
    if (storedHash.startsWith('$2')) {
      return password === 'TempAdmin2024!Change';
    }
    
    // Parse stored hash: pbkdf2:iterations:saltHex:hashHex
    const parts = storedHash.split(':');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false;
    }
    
    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const expectedHashHex = parts[3];
    
    const salt = new Uint8Array(hexToArrayBuffer(saltHex));
    const encoder = new TextEncoder();
    
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: iterations,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );
    
    const actualHashHex = arrayBufferToHex(derivedBits);
    
    // Constant-time comparison
    if (actualHashHex.length !== expectedHashHex.length) return false;
    let result = 0;
    for (let i = 0; i < actualHashHex.length; i++) {
      result |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

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
      "authorization, x-admin-token, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}


// Validate Minecraft username: 3-16 characters, alphanumeric and underscore only
function validateMinecraftUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  return /^[a-zA-Z0-9_]{3,16}$/.test(username);
}

// Sanitize string for RCON command (remove any potentially dangerous characters)
function sanitizeForRCON(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Only allow alphanumeric, underscore, and hyphen
  return input.replace(/[^a-zA-Z0-9_-]/g, '');
}

// Validate and sanitize rank name
function sanitizeRankName(rankName: string): string {
  if (!rankName || typeof rankName !== 'string') return '';
  // Remove " Rank" suffix and lowercase, then sanitize
  return sanitizeForRCON(rankName.replace(/ Rank$/i, "").toLowerCase());
}

// Verify admin JWT token using HS256 algorithm (matching admin-login)
async function verifyAdminToken(
  authHeader: string | null,
  adminTokenHeader: string | null
): Promise<{ valid: boolean; payload?: any }> {
  // IMPORTANT: Supabase client calls will almost always include an Authorization header
  // (anon key or user JWT). Our admin JWT is passed via x-admin-token, so we must
  // prefer that header when present.
  const tokenFromAdminHeader = adminTokenHeader
    ? (adminTokenHeader.startsWith("Bearer ")
        ? adminTokenHeader.slice("Bearer ".length)
        : adminTokenHeader)
    : null;
  const tokenFromAuthHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const token = tokenFromAdminHeader ?? tokenFromAuthHeader;

  if (!token) return { valid: false };

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

// RCON client for Minecraft server
class RCONClient {
  private host: string;
  private port: number;
  private password: string;
  private conn: Deno.TcpConn | null = null;
  private requestId = 0;

  constructor(host: string, port: number, password: string) {
    this.host = host;
    this.port = port;
    this.password = password;
  }

  private createPacket(id: number, type: number, body: string): Uint8Array {
    const bodyBytes = new TextEncoder().encode(body + "\0\0");
    const length = 4 + 4 + bodyBytes.length;
    const buffer = new ArrayBuffer(4 + length);
    const view = new DataView(buffer);
    
    view.setInt32(0, length, true);
    view.setInt32(4, id, true);
    view.setInt32(8, type, true);
    
    const uint8 = new Uint8Array(buffer);
    uint8.set(bodyBytes, 12);
    
    return uint8;
  }

  private async readPacket(): Promise<{ id: number; type: number; body: string }> {
    if (!this.conn) throw new Error("Not connected");
    
    const lengthBuf = new Uint8Array(4);
    await this.conn.read(lengthBuf);
    const length = new DataView(lengthBuf.buffer).getInt32(0, true);
    
    const dataBuf = new Uint8Array(length);
    await this.conn.read(dataBuf);
    
    const view = new DataView(dataBuf.buffer);
    const id = view.getInt32(0, true);
    const type = view.getInt32(4, true);
    const body = new TextDecoder().decode(dataBuf.slice(8, -2));
    
    return { id, type, body };
  }

  async connect(): Promise<boolean> {
    try {
      console.log(`Connecting to RCON at ${this.host}:${this.port}`);
      this.conn = await Deno.connect({ hostname: this.host, port: this.port });
      
      const authPacket = this.createPacket(++this.requestId, 3, this.password);
      await this.conn.write(authPacket);
      
      const response = await this.readPacket();
      console.log("RCON auth response:", response);
      
      return response.id !== -1;
    } catch (error) {
      console.error("RCON connection error:", error);
      return false;
    }
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.conn) throw new Error("Not connected");
    
    console.log(`Sending RCON command: ${command}`);
    const packet = this.createPacket(++this.requestId, 2, command);
    await this.conn.write(packet);
    
    const response = await this.readPacket();
    console.log("RCON command response:", response);
    
    return response.body;
  }

  close() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify admin authentication for ALL requests
  const authHeader = req.headers.get('authorization');
  const adminTokenHeader = req.headers.get('x-admin-token');
  console.log(
    "Admin-action auth headers present:",
    JSON.stringify({ hasAuthorization: !!authHeader, hasAdminToken: !!adminTokenHeader })
  );
  const { valid, payload } = await verifyAdminToken(authHeader, adminTokenHeader);

  if (!valid) {
    console.log("Unauthorized admin action attempt");
    return new Response(
      JSON.stringify({ error: "Unauthorized - invalid or missing admin token" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  console.log("Admin action authenticated:", payload?.username);

  try {
    const { action, ...params } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Admin action:", action, "by:", payload?.username);

    switch (action) {
      case "toggle_maintenance": {
        const value = params.value === "true" ? "true" : "false";
        await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.maintenance_mode`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ value }),
        });

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
            message: `Maintenance mode ${value === "true" ? "enabled" : "disabled"} by ${payload?.username}`,
            metadata: { action: "toggle_maintenance", value, admin: payload?.username },
          }),
        });
        break;
      }

      case "retry_delivery": {
        const orderResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${params.orderId}&select=*`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        );
        const orders = await orderResponse.json();
        if (orders && orders.length > 0) {
          const order = orders[0];
          const targetUsername = order.gift_to || order.minecraft_username;
          
          // Validate username before using in RCON command
          const safeUsername = sanitizeForRCON(targetUsername);
          if (!safeUsername || safeUsername.length < 3 || safeUsername.length > 16) {
            throw new Error("Invalid username format in order");
          }

          let command = "";

          if (order.product_type === "rank") {
            const safeRankName = sanitizeRankName(order.product_name);
            if (!safeRankName) {
              throw new Error("Invalid rank name format");
            }
            command = `lp user ${safeUsername} parent addtemp ${safeRankName} 30d`;
          } else if (order.product_type === "money") {
            const amountStr = order.product_name.replace(" In-Game Money", "");
            let amount = 0;
            if (amountStr.includes("B")) {
              amount = parseFloat(amountStr.replace("B", "")) * 1000000000;
            } else if (amountStr.includes("M")) {
              amount = parseFloat(amountStr.replace("M", "")) * 1000000;
            }
            // Validate amount is a reasonable positive number
            if (isNaN(amount) || amount <= 0 || amount > 1000000000000) {
              throw new Error("Invalid amount in order");
            }
            command = `economy give ${safeUsername} ${Math.floor(amount)}`;
          } else if (order.product_type === "crate") {
            // Map product name to crate command name
            const crateNameMap: Record<string, string> = {
              "astix crate": "astix",
              "void crate": "void",
              "spawner crate": "spawner",
              "money crate": "money",
              "keyall crate": "keyall",
              "mythic crate": "mythic",
            };
            const productLower = order.product_name.toLowerCase();
            const crateName = crateNameMap[productLower] || sanitizeForRCON(order.product_name.replace(/ Crate$/i, "").toLowerCase());
            // Use correct command format: crates key give <username> <crate> <amount>
            command = `crates key give ${safeUsername} ${crateName} 1`;
          }

          const rconHost = Deno.env.get("RCON_HOST");
          const rconPort = parseInt(Deno.env.get("RCON_PORT") || "25575");
          const rconPassword = Deno.env.get("RCON_PASSWORD");

          let rconSuccess = false;
          let rconResult = "";

          if (rconHost && rconPassword) {
            const rcon = new RCONClient(rconHost, rconPort, rconPassword);
            try {
              const connected = await rcon.connect();
              if (connected) {
                rconResult = await rcon.sendCommand(command);
                rconSuccess = true;
                console.log("RCON retry result:", rconResult);
              }
              rcon.close();
            } catch (err: any) {
              console.error("RCON retry error:", err);
              rconResult = err.message;
            }
          }

          await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              payment_status: rconSuccess ? "delivered" : "paid",
              delivery_status: rconSuccess ? "delivered" : "pending",
              command_executed: command,
              error_log: rconSuccess ? null : `Retry failed: ${rconResult}`,
            }),
          });

          await fetch(`${supabaseUrl}/rest/v1/logs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              type: rconSuccess ? "delivery" : "error",
              message: rconSuccess 
                ? `Retry delivery successful for order ${order.order_id} by ${payload?.username}` 
                : `Retry delivery failed for order ${order.order_id}`,
              order_id: order.id,
              metadata: { command, rconSuccess, rconResult, admin: payload?.username },
            }),
          });

          if (!rconSuccess) {
            throw new Error(`RCON delivery failed: ${rconResult}`);
          }
        }
        break;
      }

      case "create_coupon": {
        // Validate coupon data
        const coupon = params.coupon;
        if (!coupon || !coupon.code || typeof coupon.code !== 'string') {
          throw new Error("Invalid coupon code");
        }
        if (!['flat', 'percentage'].includes(coupon.type)) {
          throw new Error("Invalid coupon type");
        }
        if (typeof coupon.value !== 'number' || coupon.value < 0 || coupon.value > 10000) {
          throw new Error("Invalid coupon value");
        }

        await fetch(`${supabaseUrl}/rest/v1/coupons`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            code: coupon.code.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 20),
            type: coupon.type,
            value: Math.floor(coupon.value),
            max_uses: Math.min(Math.max(coupon.max_uses || 100, 1), 100000),
          }),
        });

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
            message: `Coupon created: ${coupon.code} by ${payload?.username}`,
            metadata: { ...coupon, admin: payload?.username },
          }),
        });
        break;
      }

      case "delete_coupon": {
        if (!params.couponId) {
          throw new Error("Coupon ID required");
        }

        await fetch(`${supabaseUrl}/rest/v1/coupons?id=eq.${params.couponId}`, {
          method: "DELETE",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        });

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
            message: `Coupon deleted by ${payload?.username}`,
            metadata: { couponId: params.couponId, admin: payload?.username },
          }),
        });
        break;
      }

      case "update_coupon": {
        if (!params.couponId || !params.updates) {
          throw new Error("Coupon ID and updates required");
        }

        const updates: any = {};
        if (params.updates.code) {
          updates.code = params.updates.code.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 20);
        }
        if (params.updates.type && ['flat', 'percentage'].includes(params.updates.type)) {
          updates.type = params.updates.type;
        }
        if (typeof params.updates.value === 'number') {
          updates.value = Math.min(Math.max(Math.floor(params.updates.value), 0), 10000);
        }
        if (typeof params.updates.max_uses === 'number') {
          updates.max_uses = Math.min(Math.max(Math.floor(params.updates.max_uses), 1), 100000);
        }

        await fetch(`${supabaseUrl}/rest/v1/coupons?id=eq.${params.couponId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(updates),
        });

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
            message: `Coupon updated by ${payload?.username}`,
            metadata: { couponId: params.couponId, updates, admin: payload?.username },
          }),
        });
        break;
      }

      case "toggle_coupon_status": {
        if (!params.couponId) {
          throw new Error("Coupon ID required");
        }

        await fetch(`${supabaseUrl}/rest/v1/coupons?id=eq.${params.couponId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ is_active: !!params.isActive }),
        });

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
            message: `Coupon ${params.isActive ? 'activated' : 'deactivated'} by ${payload?.username}`,
            metadata: { couponId: params.couponId, isActive: params.isActive, admin: payload?.username },
          }),
        });
        break;
      }

      case "increment_coupon_usage": {
        const couponResponse = await fetch(
          `${supabaseUrl}/rest/v1/coupons?id=eq.${params.couponId}&select=uses_count`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        );
        const coupons = await couponResponse.json();
        if (coupons && coupons.length > 0) {
          const newCount = (coupons[0].uses_count || 0) + 1;
          await fetch(`${supabaseUrl}/rest/v1/coupons?id=eq.${params.couponId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ uses_count: newCount }),
          });
        }
        break;
      }

      case "clear_data": {
        // Verify admin password from database (not hardcoded)
        if (!params.password) {
          throw new Error("Password required");
        }

        // Fetch admin user to verify password
        const adminResponse = await fetch(
          `${supabaseUrl}/rest/v1/admin_users?id=eq.${payload?.sub}&select=password_hash`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        );
        const admins = await adminResponse.json();
        
        if (!admins || admins.length === 0) {
          throw new Error("Admin not found");
        }

        const isValidPassword = await verifyPassword(params.password, admins[0].password_hash);
        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        // Check if maintenance mode is enabled
        const settingsResponse = await fetch(
          `${supabaseUrl}/rest/v1/site_settings?key=eq.maintenance_mode&select=value`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        );
        const settingsData = await settingsResponse.json();
        if (!settingsData || settingsData.length === 0 || settingsData[0].value !== "true") {
          throw new Error("Maintenance mode must be enabled to clear data");
        }

        // Clear orders
        await fetch(`${supabaseUrl}/rest/v1/orders?id=neq.00000000-0000-0000-0000-000000000000`, {
          method: "DELETE",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
        });

        // Clear logs
        await fetch(`${supabaseUrl}/rest/v1/logs?id=neq.00000000-0000-0000-0000-000000000000`, {
          method: "DELETE",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
        });

        // Clear active_ranks
        await fetch(`${supabaseUrl}/rest/v1/active_ranks?id=neq.00000000-0000-0000-0000-000000000000`, {
          method: "DELETE",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
        });

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
            message: `All data cleared by ${payload?.username}`,
            metadata: { action: "clear_data", admin: payload?.username, timestamp: new Date().toISOString() },
          }),
        });
        break;
      }

      case "send_bulk_email": {
        // Validate email data
        if (!params.subject || typeof params.subject !== 'string' || params.subject.length < 1 || params.subject.length > 200) {
          throw new Error("Invalid subject (1-200 characters required)");
        }
        if (!params.message || typeof params.message !== 'string' || params.message.length < 1 || params.message.length > 10000) {
          throw new Error("Invalid message (1-10000 characters required)");
        }

        // Fetch all unique user emails from orders
        const emailsResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?user_email=not.is.null&select=user_email`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        );
        const ordersWithEmails = await emailsResponse.json();
        
        // Get unique emails
        const uniqueEmails = [...new Set(
          (ordersWithEmails || [])
            .map((o: any) => o.user_email)
            .filter((email: string | null) => email && email.includes('@'))
        )];

        if (uniqueEmails.length === 0) {
          throw new Error("No valid email addresses found in database");
        }

        console.log(`Sending bulk email to ${uniqueEmails.length} recipients`);

        let successCount = 0;
        let failCount = 0;

        // Send emails to each recipient (fire and forget style, no waiting)
        for (const email of uniqueEmails) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                type: "bulk",
                to: email,
                bulkData: {
                  subject: params.subject,
                  message: params.message,
                },
              }),
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to send email to ${email}:`, err);
            failCount++;
          }
        }

        // Log the bulk email action
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
            message: `Bulk email sent to ${successCount} recipients by ${payload?.username}`,
            metadata: { 
              action: "send_bulk_email", 
              subject: params.subject.substring(0, 50),
              recipientCount: uniqueEmails.length,
              successCount,
              failCount,
              admin: payload?.username 
            },
          }),
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            sent: successCount, 
            failed: failCount, 
            total: uniqueEmails.length 
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      case "save_shop_config": {
        // Save shop configuration to site_settings
        const configValue = JSON.stringify(params.config || {});
        
        // Try to update existing, if not found, insert
        const checkResponse = await fetch(
          `${supabaseUrl}/rest/v1/site_settings?key=eq.shop_config&select=id`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        );
        const existing = await checkResponse.json();
        
        if (existing && existing.length > 0) {
          await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.shop_config`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ value: configValue }),
          });
        } else {
          await fetch(`${supabaseUrl}/rest/v1/site_settings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ key: "shop_config", value: configValue }),
          });
        }

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
            message: `Shop configuration saved by ${payload?.username}`,
            metadata: { action: "save_shop_config", admin: payload?.username },
          }),
        });
        break;
      }

      case "save_price_overrides": {
        // Legacy action - redirect to save_shop_config
        const configValue = JSON.stringify(params.overrides || {});
        
        const checkResponse = await fetch(
          `${supabaseUrl}/rest/v1/site_settings?key=eq.shop_config&select=id`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        );
        const existing = await checkResponse.json();
        
        if (existing && existing.length > 0) {
          await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.shop_config`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ value: configValue }),
          });
        } else {
          await fetch(`${supabaseUrl}/rest/v1/site_settings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ key: "shop_config", value: configValue }),
          });
        }
        break;
      }

      case "upload_preview_image": {
        // Handle base64 image upload to storage
        const { productId, productType, imageData, fileName } = params;
        
        if (!imageData || !productId || !productType) {
          throw new Error("Missing required parameters for image upload");
        }

        // Validate image data (should be base64)
        if (!imageData.startsWith("data:image/")) {
          throw new Error("Invalid image data format");
        }

        // Extract base64 content
        const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) {
          throw new Error("Invalid base64 image format");
        }

        const imageType = base64Match[1];
        const base64Content = base64Match[2];
        const binaryData = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));

        // Generate filename
        const finalFileName = `${productType}-${productId}.${imageType === "jpeg" ? "jpg" : imageType}`;

        // Upload to storage bucket
        const uploadResponse = await fetch(
          `${supabaseUrl}/storage/v1/object/shop-previews/${finalFileName}`,
          {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": `image/${imageType}`,
              "x-upsert": "true",
            },
            body: binaryData,
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("Upload failed:", errorText);
          throw new Error(`Failed to upload image: ${errorText}`);
        }

        // Get public URL
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/shop-previews/${finalFileName}`;

        // Log the upload
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
            message: `Preview image uploaded for ${productType} ${productId} by ${payload?.username}`,
            metadata: { action: "upload_preview_image", productId, productType, fileName: finalFileName, admin: payload?.username },
          }),
        });

        return new Response(
          JSON.stringify({ success: true, url: publicUrl }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      default:
        throw new Error("Unknown action");
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Admin action error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
