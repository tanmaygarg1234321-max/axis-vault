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

interface CartItem {
  type: string;
  productId: string;
  quantity: number;
  name: string;
  amountInt?: number; // For money packages
}

interface CommandResult {
  command: string;
  success: boolean;
  result?: string;
  error?: string;
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

    // Update order status to paid immediately
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

    // Parse cart items from error_log
    let cartItems: CartItem[] = [];
    try {
      if (order.error_log && order.error_log.startsWith('{')) {
        const parsed = JSON.parse(order.error_log);
        if (parsed.cartItems) {
          cartItems = parsed.cartItems;
        }
      }
    } catch (e) {
      console.log("No cart items in order, using single product");
    }

    // If no cart items, create from order
    if (cartItems.length === 0) {
      cartItems = [{
        type: order.product_type,
        productId: order.product_name.toLowerCase().replace(/ /g, '-'),
        quantity: 1,
        name: order.product_name,
      }];
    }

    // Get RCON credentials
    const rconHost = Deno.env.get("RCON_HOST");
    const rconPort = parseInt(Deno.env.get("RCON_PORT") || "25584");
    const rconPassword = Deno.env.get("RCON_PASSWORD");

    let rcon: RCONClient | null = null;
    let rconConnected = false;

    // Parse RCON host (may contain port like "host:port")
    let actualHost = rconHost || "";
    if (actualHost.includes(":")) {
      actualHost = actualHost.split(":")[0];
    }

    if (actualHost && rconPassword) {
      rcon = new RCONClient(actualHost, rconPort, rconPassword);
      try {
        rconConnected = await rcon.connect();
        console.log("RCON connected:", rconConnected);
      } catch (err) {
        console.error("Failed to connect to RCON:", err);
      }
    } else {
      console.log("RCON credentials not configured");
    }

    const commandResults: CommandResult[] = [];
    let deliverySuccess = false;

    try {
      // Process each item in the cart separately
      for (const item of cartItems) {
        for (let i = 0; i < item.quantity; i++) {
          let command = "";
          
          if (item.type === "rank") {
            // Rank command: lp user <username> parent addtemp <rank> 30d
            const rankName = item.name.replace(/ Rank$/i, "");
            const safeRankName = rankName.charAt(0).toUpperCase() + rankName.slice(1).toLowerCase();
            
            command = `lp user ${safeUsername} parent addtemp ${safeRankName} 30d`;
            
            if (rconConnected && rcon) {
              try {
                const result = await rcon.sendCommand(command);
                commandResults.push({ command, success: true, result });
                console.log("Rank RCON result:", result);
                
                // Store active rank for expiry tracking
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
                
                deliverySuccess = true;
              } catch (err: any) {
                commandResults.push({ command, success: false, error: err.message });
              }
            } else {
              commandResults.push({ command, success: false, error: "RCON not connected" });
            }
            
          } else if (item.type === "crate") {
            // Crate command: crates giveKey <cratename> <username> <qty>
            const crateCommandMap: Record<string, string> = {
              "keyall crate": "keall_crate",
              "money crate": "Moneycrate",
              "astro crate": "astro_crate",
              "moon crate": "Moon_crate",
            };
            
            const crateLower = item.name.toLowerCase();
            const crateName = crateCommandMap[crateLower] || sanitizeForRCON(item.name.replace(/ Crate$/i, "").replace(/ /g, "_"));
            
            if (crateName) {
              command = `crates giveKey ${crateName} ${safeUsername} 1`;
              
              if (rconConnected && rcon) {
                try {
                  const result = await rcon.sendCommand(command);
                  commandResults.push({ command, success: true, result });
                  console.log("Crate RCON result:", result);
                  deliverySuccess = true;
                } catch (err: any) {
                  commandResults.push({ command, success: false, error: err.message });
                }
              } else {
                commandResults.push({ command, success: false, error: "RCON not connected" });
              }
            }
            
          } else if (item.type === "money") {
            // Money command: eco give <username> <amount>
            // Extract amount from the item
            let moneyAmount = item.amountInt || 0;
            
            // If no amountInt, try to parse from name
            if (!moneyAmount) {
              const match = item.name.match(/(\d+)([MB])/i);
              if (match) {
                const num = parseInt(match[1]);
                const unit = match[2].toUpperCase();
                moneyAmount = unit === 'B' ? num * 1000000000 : num * 1000000;
              }
            }
            
            if (moneyAmount > 0) {
              command = `eco give ${safeUsername} ${moneyAmount}`;
              
              if (rconConnected && rcon) {
                try {
                  const result = await rcon.sendCommand(command);
                  commandResults.push({ command, success: true, result });
                  console.log("Money RCON result:", result);
                  deliverySuccess = true;
                } catch (err: any) {
                  commandResults.push({ command, success: false, error: err.message });
                }
              } else {
                commandResults.push({ command, success: false, error: "RCON not connected" });
              }
            }
          }
        }
      }

      // Close RCON connection
      if (rcon) {
        rcon.close();
      }

      // Determine delivery status
      const allSuccessful = commandResults.length > 0 && commandResults.every(r => r.success);
      const finalDeliveryStatus = allSuccessful ? "delivered" : "pending";
      const finalPaymentStatus = allSuccessful ? "delivered" : "paid";

      // Generate commands summary for display
      const commandsSummary = commandResults.map(r => 
        r.success ? `✓ ${r.command}` : `✗ ${r.command}: ${r.error}`
      ).join("\n");

      // Update order with delivery status and commands executed
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
          command_executed: commandsSummary.substring(0, 500),
          error_log: JSON.stringify({ cartItems, commandResults }),
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
          type: allSuccessful ? "delivery" : "info",
          message: allSuccessful 
            ? `Delivered ${cartItems.length} items to ${safeUsername}` 
            : `Order ${orderId} pending delivery - some commands failed`,
          order_id: order.id,
          metadata: { cartItems, commandResults, rconConnected },
        }),
      });

      // Send success email if user has email
      if (order.user_email) {
        // Build items list for email
        const itemsList = cartItems.map(item => 
          `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`
        ).join(", ");
        
        await sendEmail(supabaseUrl, supabaseKey, {
          type: "receipt",
          to: order.user_email,
          orderData: {
            orderId: order.order_id,
            productName: itemsList,
            amount: order.amount,
            minecraftUsername: order.minecraft_username,
            giftTo: order.gift_to,
            createdAt: order.created_at,
            cartItems: cartItems,
          },
        });
      }

    } catch (deliveryError: any) {
      console.error("Delivery error:", deliveryError);

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
          error_log: JSON.stringify({ cartItems, error: deliveryError.message }),
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
          message: `Delivery failed for order ${orderId}: ${deliveryError.message}`,
          order_id: order.id,
          metadata: { cartItems, error: deliveryError.message },
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
