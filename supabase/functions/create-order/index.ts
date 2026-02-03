import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// CORS configuration with origin validation
const ALLOWED_ORIGINS = [
  'https://preview--jeqsesqlkjklhyvszpgg.lovable.app',
  'https://jeqsesqlkjklhyvszpgg.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Validate Minecraft username: 3-16 characters, alphanumeric and underscore only
function validateMinecraftUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  return /^[a-zA-Z0-9_]{3,16}$/.test(username);
}

// Validate Discord username (basic validation)
function validateDiscordUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  // Discord usernames: 2-32 characters
  return username.length >= 2 && username.length <= 32 && !/[<>@#:```]/.test(username);
}

// Sanitize string for safe storage
function sanitizeInput(input: string, maxLength: number = 100): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().substring(0, maxLength);
}

// Validate email format
function validateEmail(email: string): boolean {
  if (!email) return true; // Email is optional
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

interface CartItem {
  type: string;
  productId: string;
  quantity: number;
  name: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both old single-product format and new cart format
    let cartItems: CartItem[] = [];
    let totalAmount = 0;
    let productName = "";
    let productType = "";
    
    if (body.cartItems && Array.isArray(body.cartItems)) {
      // New cart format
      cartItems = body.cartItems;
      totalAmount = body.amount;
      productName = cartItems.length === 1 ? cartItems[0].name : `${cartItems.length} items bundle`;
      productType = cartItems.length === 1 ? cartItems[0].type : "bundle";
    } else {
      // Old single-product format (backward compatibility)
      cartItems = [{
        type: body.productType,
        productId: body.productId,
        quantity: 1,
        name: body.productName,
      }];
      totalAmount = body.amount;
      productName = body.productName;
      productType = body.productType;
    }

    const { minecraftUsername, discordUsername, giftTo, couponId, userId, userEmail } = body;

    // Input validation
    if (!validateMinecraftUsername(minecraftUsername)) {
      return new Response(
        JSON.stringify({ error: "Invalid Minecraft username. Must be 3-16 characters, alphanumeric and underscore only." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!validateDiscordUsername(discordUsername)) {
      return new Response(
        JSON.stringify({ error: "Invalid Discord username format." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (giftTo && !validateMinecraftUsername(giftTo)) {
      return new Response(
        JSON.stringify({ error: "Invalid gift recipient username. Must be 3-16 characters, alphanumeric and underscore only." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (userEmail && !validateEmail(userEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate amount
    if (typeof totalAmount !== 'number' || totalAmount <= 0 || totalAmount > 1000000) {
      return new Response(
        JSON.stringify({ error: "Invalid amount." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Creating order:", { cartItems, totalAmount, minecraftUsername, couponId, userId });

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
        amount: Math.floor(totalAmount * 100),
        currency: "INR",
        receipt: orderId,
        notes: {
          product_name: sanitizeInput(productName, 100),
          minecraft_username: minecraftUsername,
          items_count: cartItems.length,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay error:", errorText);
      throw new Error("Failed to create payment order");
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log("Razorpay order created:", razorpayOrder.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create order in database with cart items stored as JSON in metadata
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
        discord_username: sanitizeInput(discordUsername, 32),
        product_name: sanitizeInput(productName, 100),
        product_type: productType === "bundle" ? "crate" : productType, // Use 'crate' for bundles as fallback
        amount: Math.floor(totalAmount),
        razorpay_order_id: razorpayOrder.id,
        gift_to: giftTo || null,
        payment_status: "pending",
        delivery_status: "pending",
        user_id: userId || null,
        user_email: userEmail ? sanitizeInput(userEmail, 255) : null,
        // Store cart items in error_log temporarily (we can add a proper column later)
        error_log: JSON.stringify({ cartItems }),
      }),
    });

    // If coupon was used, increment its usage count
    if (couponId) {
      const couponResponse = await fetch(
        `${supabaseUrl}/rest/v1/coupons?id=eq.${couponId}&select=uses_count`,
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
        await fetch(`${supabaseUrl}/rest/v1/coupons?id=eq.${couponId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ uses_count: newCount }),
        });
        console.log(`Coupon ${couponId} usage incremented to ${newCount}`);
      }
    }

    // Log order creation
    await fetch(`${supabaseUrl}/rest/v1/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        type: "info",
        message: `Order created: ${orderId} for ${sanitizeInput(productName, 50)}`,
        metadata: { orderId, productName: sanitizeInput(productName, 50), amount: totalAmount, minecraftUsername, couponId: couponId || null, userId: userId || null, cartItems },
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
      JSON.stringify({ error: "Failed to create order" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
