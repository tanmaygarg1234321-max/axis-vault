import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      
      // Send auth packet (type 3)
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

  try {
    const { action, ...params } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Admin action:", action, params);

    switch (action) {
      case "toggle_maintenance": {
        await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.maintenance_mode`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ value: params.value }),
        });

        // Log admin action
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
            message: `Maintenance mode ${params.value === "true" ? "enabled" : "disabled"}`,
            metadata: { action: "toggle_maintenance", value: params.value },
          }),
        });
        break;
      }

      case "retry_delivery": {
        // Get order details
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
          let command = "";

          if (order.product_type === "rank") {
            const rankName = order.product_name.replace(" Rank", "").toLowerCase();
            command = `lp user ${targetUsername} parent addtemp ${rankName} 30d`;
          } else if (order.product_type === "money") {
            const amountStr = order.product_name.replace(" In-Game Money", "");
            let amount = 0;
            if (amountStr.includes("B")) {
              amount = parseFloat(amountStr.replace("B", "")) * 1000000000;
            } else if (amountStr.includes("M")) {
              amount = parseFloat(amountStr.replace("M", "")) * 1000000;
            }
            command = `economy give ${targetUsername} ${Math.floor(amount)}`;
          } else if (order.product_type === "crate") {
            command = `say ${targetUsername} bought ${order.product_name}`;
          }

          // Try RCON delivery
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

          // Update order
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

          // Log
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
                ? `Retry delivery successful for order ${order.order_id}` 
                : `Retry delivery failed for order ${order.order_id}`,
              order_id: order.id,
              metadata: { command, rconSuccess, rconResult },
            }),
          });

          if (!rconSuccess) {
            throw new Error(`RCON delivery failed: ${rconResult}`);
          }
        }
        break;
      }

      case "create_coupon": {
        await fetch(`${supabaseUrl}/rest/v1/coupons`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(params.coupon),
        });

        // Log
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
            message: `Coupon created: ${params.coupon.code}`,
            metadata: params.coupon,
          }),
        });
        break;
      }

      case "delete_coupon": {
        await fetch(`${supabaseUrl}/rest/v1/coupons?id=eq.${params.couponId}`, {
          method: "DELETE",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        });

        // Log
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
            message: `Coupon deleted`,
            metadata: { couponId: params.couponId },
          }),
        });
        break;
      }

      case "update_coupon": {
        await fetch(`${supabaseUrl}/rest/v1/coupons?id=eq.${params.couponId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(params.updates),
        });

        // Log
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
            message: `Coupon updated: ${params.updates.code || params.couponId}`,
            metadata: { couponId: params.couponId, updates: params.updates },
          }),
        });
        break;
      }

      case "toggle_coupon_status": {
        await fetch(`${supabaseUrl}/rest/v1/coupons?id=eq.${params.couponId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ is_active: params.isActive }),
        });

        // Log
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
            message: `Coupon ${params.isActive ? 'activated' : 'deactivated'}`,
            metadata: { couponId: params.couponId, isActive: params.isActive },
          }),
        });
        break;
      }

      case "increment_coupon_usage": {
        // Increment coupon uses_count
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
        // Verify admin password - use the hardcoded admin credentials
        // Since admin_users table is empty, we use the same credentials as admin-login
        const ADMIN_USERNAME = "admin";
        const ADMIN_PASSWORD = "axis2024admin";
        
        if (params.username !== ADMIN_USERNAME || params.password !== ADMIN_PASSWORD) {
          throw new Error("Invalid credentials");
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

        // Log the clear action (new log after clearing)
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
            message: "All data cleared by admin",
            metadata: { action: "clear_data", timestamp: new Date().toISOString() },
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
