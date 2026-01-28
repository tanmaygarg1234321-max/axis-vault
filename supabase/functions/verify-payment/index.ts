import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

// Helper to send emails
async function sendEmail(supabaseUrl: string, supabaseKey: string, emailData: any) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(emailData),
    });
    
    if (!response.ok) {
      console.error("Email send failed:", await response.text());
    } else {
      console.log("Email sent successfully");
    }
  } catch (err) {
    console.error("Email error:", err);
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = await req.json();

    console.log("Verifying payment:", { razorpay_order_id, razorpay_payment_id, orderId });

    // Verify signature
    const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    );
    
    const generatedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (generatedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      throw new Error("Payment verification failed");
    }

    console.log("Signature verified successfully");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Fetch order details
    const orderResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?order_id=eq.${encodeURIComponent(orderId)}&select=*`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    const orders = await orderResponse.json();
    if (!orders || orders.length === 0) {
      throw new Error("Order not found");
    }

    const order = orders[0];
    console.log("Order found:", order);

    // Validate usernames from order
    const targetUsername = order.gift_to || order.minecraft_username;
    
    if (!validateMinecraftUsername(targetUsername)) {
      console.error("Invalid username in order:", targetUsername);
      throw new Error("Invalid username format in order");
    }

    const safeUsername = sanitizeForRCON(targetUsername);

    // Update order status to paid
    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        razorpay_payment_id: razorpay_payment_id,
        payment_status: "paid",
      }),
    });

    // Log payment success
    await fetch(`${supabaseUrl}/rest/v1/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        type: "payment",
        message: `Payment verified for order ${orderId}`,
        order_id: order.id,
        metadata: { razorpay_payment_id },
      }),
    });

    // Process delivery with RCON
    let command = "";
    let deliverySuccess = false;
    let errorLog = "";

    // Get RCON credentials
    const rconHost = Deno.env.get("RCON_HOST");
    const rconPort = parseInt(Deno.env.get("RCON_PORT") || "25575");
    const rconPassword = Deno.env.get("RCON_PASSWORD");

    let rcon: RCONClient | null = null;
    let rconConnected = false;

    if (rconHost && rconPassword) {
      rcon = new RCONClient(rconHost, rconPort, rconPassword);
      try {
        rconConnected = await rcon.connect();
        console.log("RCON connected:", rconConnected);
      } catch (err) {
        console.error("Failed to connect to RCON:", err);
      }
    } else {
      console.log("RCON credentials not configured");
    }

    try {
      if (order.product_type === "rank") {
        // Extract and sanitize rank name
        const safeRankName = sanitizeRankName(order.product_name);
        if (!safeRankName) {
          throw new Error("Invalid rank name format");
        }
        
        command = `lp user ${safeUsername} parent addtemp ${safeRankName} 30d`;
        
        // Execute RCON command
        if (rconConnected && rcon) {
          const result = await rcon.sendCommand(command);
          console.log("RCON result:", result);
          
          // Log RCON execution
          await fetch(`${supabaseUrl}/rest/v1/logs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              type: "rcon",
              message: `RCON command executed: ${command}`,
              order_id: order.id,
              metadata: { command, result },
            }),
          });
        }

        // Store active rank for expiry tracking (30 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await fetch(`${supabaseUrl}/rest/v1/active_ranks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            order_id: order.id,
            minecraft_username: safeUsername,
            rank_name: safeRankName,
            expires_at: expiresAt.toISOString(),
          }),
        });

        console.log(`Rank ${safeRankName} granted to ${safeUsername} until ${expiresAt}`);
        deliverySuccess = true;

      } else if (order.product_type === "money") {
        // Extract amount from product name
        const amountStr = order.product_name.replace(" In-Game Money", "");
        let amount = 0;
        if (amountStr.includes("B")) {
          amount = parseFloat(amountStr.replace("B", "")) * 1000000000;
        } else if (amountStr.includes("M")) {
          amount = parseFloat(amountStr.replace("M", "")) * 1000000;
        }

        // Validate amount
        if (isNaN(amount) || amount <= 0 || amount > 1000000000000) {
          throw new Error("Invalid amount format");
        }

        command = `economy give ${safeUsername} ${Math.floor(amount)}`;
        
        // Execute RCON command
        if (rconConnected && rcon) {
          const result = await rcon.sendCommand(command);
          console.log("RCON result:", result);
          
          await fetch(`${supabaseUrl}/rest/v1/logs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              type: "rcon",
              message: `RCON command executed: ${command}`,
              order_id: order.id,
              metadata: { command, result },
            }),
          });
        }
        
        console.log(`Money command: ${command}`);
        deliverySuccess = true;

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
        
        if (!crateName) {
          throw new Error("Invalid crate name format");
        }
        
        // Use the crates key give command format: crates key give <username> <crate> <amount>
        command = `crates key give ${safeUsername} ${crateName} 1`;
        
        // Execute RCON command
        if (rconConnected && rcon) {
          const result = await rcon.sendCommand(command);
          console.log("RCON result:", result);
          
          await fetch(`${supabaseUrl}/rest/v1/logs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              type: "rcon",
              message: `RCON command executed: ${command}`,
              order_id: order.id,
              metadata: { command, result },
            }),
          });
        }
        
        console.log(`Crate delivery: ${command}`);
        deliverySuccess = true;
      }

      // Close RCON connection
      if (rcon) {
        rcon.close();
      }

      // Determine delivery status based on RCON connection
      const finalDeliveryStatus = rconConnected ? "delivered" : "pending";
      const finalPaymentStatus = rconConnected ? "delivered" : "paid";

      // Update order with delivery status and command
      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          payment_status: finalPaymentStatus,
          delivery_status: finalDeliveryStatus,
          command_executed: command,
          error_log: !rconConnected ? "RCON not connected - pending manual delivery" : null,
        }),
      });

      // Log delivery
      await fetch(`${supabaseUrl}/rest/v1/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          type: rconConnected ? "delivery" : "info",
          message: rconConnected 
            ? `Delivered ${order.product_name} to ${safeUsername}` 
            : `Order ${orderId} pending delivery - RCON not available`,
          order_id: order.id,
          metadata: { command, rconConnected },
        }),
      });

      // Send success email if user has email
      if (order.user_email) {
        await sendEmail(supabaseUrl, supabaseKey, {
          type: "receipt",
          to: order.user_email,
          orderData: {
            orderId: order.order_id,
            productName: order.product_name,
            amount: order.amount,
            minecraftUsername: order.minecraft_username,
            giftTo: order.gift_to,
            createdAt: order.created_at,
          },
        });
      }

    } catch (deliveryError: any) {
      console.error("Delivery error:", deliveryError);
      errorLog = deliveryError.message;

      if (rcon) {
        rcon.close();
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
          delivery_status: "pending",
          command_executed: command,
          error_log: errorLog,
        }),
      });

      // Log error
      await fetch(`${supabaseUrl}/rest/v1/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          type: "error",
          message: `Delivery failed for order ${orderId}: ${errorLog}`,
          order_id: order.id,
          metadata: { command, error: errorLog },
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, delivered: deliverySuccess }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
