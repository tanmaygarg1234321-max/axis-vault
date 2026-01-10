import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Verify admin JWT token
async function verifyAdminToken(authHeader: string | null): Promise<{ valid: boolean; payload?: any }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false };
  }

  const jwtSecret = Deno.env.get("ADMIN_JWT_SECRET");
  if (!jwtSecret) {
    console.error("ADMIN_JWT_SECRET not configured");
    return { valid: false };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const payload = await verify(token, key);
    
    if (payload.role !== 'admin') {
      console.log("Token does not have admin role");
      return { valid: false };
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify admin authentication for ALL requests
  const authHeader = req.headers.get('authorization');
  const { valid, payload } = await verifyAdminToken(authHeader);

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
            const safeProductName = sanitizeForRCON(order.product_name.replace(/ /g, '_'));
            command = `say ${safeUsername} bought ${safeProductName}`;
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

        const isValidPassword = await bcrypt.compare(params.password, admins[0].password_hash);
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
