import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        type: "payment_verified",
        message: `Payment verified for order ${orderId}`,
        order_id: order.id,
        metadata: { razorpay_payment_id },
      }),
    });

    // Process delivery
    const targetUsername = order.gift_to || order.minecraft_username;
    let command = "";
    let deliverySuccess = false;
    let errorLog = "";

    try {
      if (order.product_type === "rank") {
        // Extract rank name from product_id
        const rankName = order.product_name.replace(" Rank", "").toLowerCase();
        command = `/lp user ${targetUsername} parent set ${rankName}`;
        
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
        command = `/economy give ${targetUsername} ${Math.floor(amount)}`;
        console.log(`Money command: ${command}`);
        deliverySuccess = true;
      } else if (order.product_type === "crate") {
        command = `Crate ${order.product_name} delivered to ${targetUsername}`;
        console.log(`Crate delivery: ${command}`);
        deliverySuccess = true;
      }

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
          payment_status: "delivered",
          delivery_status: "delivered",
          command_executed: command,
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
          type: "delivery_success",
          message: `Delivered ${order.product_name} to ${targetUsername}`,
          order_id: order.id,
          metadata: { command },
        }),
      });

    } catch (deliveryError: any) {
      console.error("Delivery error:", deliveryError);
      errorLog = deliveryError.message;

      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          delivery_status: "failed",
          error_log: errorLog,
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
