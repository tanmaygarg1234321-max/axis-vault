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
      `${supabaseUrl}/rest/v1/orders?order_id=eq.${orderId}&select=*`,
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
    const targetUsername = order.gift_to || order.minecraft_username;
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
        // Extract rank name from product_name
        const rankName = order.product_name.replace(" Rank", "").toLowerCase();
        command = `lp user ${targetUsername} parent set ${rankName}`;
        
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
            minecraft_username: targetUsername,
            rank_name: rankName,
            expires_at: expiresAt.toISOString(),
          }),
        });

        console.log(`Rank ${rankName} granted to ${targetUsername} until ${expiresAt}`);
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
        command = `economy give ${targetUsername} ${Math.floor(amount)}`;
        
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
        // Broadcast purchase via say command
        command = `say ${targetUsername} bought ${order.product_name}`;
        
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
            ? `Delivered ${order.product_name} to ${targetUsername}` 
            : `Order ${orderId} pending delivery - RCON not available`,
          order_id: order.id,
          metadata: { command, rconConnected },
        }),
      });

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
