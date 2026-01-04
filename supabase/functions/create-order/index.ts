import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productType, productId, productName, amount, minecraftUsername, discordUsername, giftTo, couponId } = await req.json();

    console.log("Creating order:", { productType, productId, productName, amount, minecraftUsername });

    const orderId = `AXS${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create Razorpay order via their API
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const authHeader = btoa(`${razorpayKeyId}:${razorpaySecret}`);

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: "INR",
        receipt: orderId,
        notes: {
          product_type: productType,
          product_id: productId,
          minecraft_username: minecraftUsername,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay error:", errorText);
      throw new Error("Failed to create Razorpay order");
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log("Razorpay order created:", razorpayOrder.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    await fetch(`${supabaseUrl}/rest/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        order_id: orderId,
        minecraft_username: minecraftUsername,
        discord_username: discordUsername,
        product_name: productName,
        product_type: productType,
        amount: amount,
        razorpay_order_id: razorpayOrder.id,
        gift_to: giftTo,
        payment_status: "pending",
        delivery_status: "pending",
      }),
    });

    return new Response(
      JSON.stringify({
        razorpayOrderId: razorpayOrder.id,
        orderId: orderId,
        razorpayKeyId: razorpayKeyId,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Create order error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
