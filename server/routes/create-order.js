/**
 * Create Order Route Handler
 * Creates Razorpay payment order and stores in database
 */

const db = require("../lib/supabase");
const { validateMinecraftUsername, validateDiscordUsername, validateEmail, sanitizeInput } = require("../lib/validation");

/**
 * Handle order creation
 * POST /functions/v1/create-order
 */
async function handleCreateOrder(req, res) {
  try {
    const { productType, productId, productName, amount, minecraftUsername, discordUsername, giftTo, couponId, userId, userEmail } = req.body;

    // Input validation
    if (!validateMinecraftUsername(minecraftUsername)) {
      return res.status(400).json({ error: "Invalid Minecraft username. Must be 3-16 characters, alphanumeric and underscore only." });
    }

    if (!validateDiscordUsername(discordUsername)) {
      return res.status(400).json({ error: "Invalid Discord username format." });
    }

    if (giftTo && !validateMinecraftUsername(giftTo)) {
      return res.status(400).json({ error: "Invalid gift recipient username. Must be 3-16 characters, alphanumeric and underscore only." });
    }

    if (userEmail && !validateEmail(userEmail)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Validate amount
    if (typeof amount !== "number" || amount <= 0 || amount > 1000000) {
      return res.status(400).json({ error: "Invalid amount." });
    }

    // Validate product type
    if (!["rank", "crate", "money"].includes(productType)) {
      return res.status(400).json({ error: "Invalid product type." });
    }

    console.log("Creating order:", { productType, productId, productName, amount, minecraftUsername, couponId, userId });

    const orderId = `AXS${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create Razorpay order via their API
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!razorpayKeyId || !razorpaySecret) {
      throw new Error("Payment gateway not configured");
    }
    
    const authHeader = Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString("base64");

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: Math.floor(amount * 100),
        currency: "INR",
        receipt: orderId,
        notes: {
          product_type: productType,
          product_id: sanitizeInput(productId, 50),
          minecraft_username: minecraftUsername,
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

    // Store order in database
    await db.insert("orders", {
      order_id: orderId,
      minecraft_username: minecraftUsername,
      discord_username: sanitizeInput(discordUsername, 32),
      product_name: sanitizeInput(productName, 100),
      product_type: productType,
      amount: Math.floor(amount),
      razorpay_order_id: razorpayOrder.id,
      gift_to: giftTo || null,
      payment_status: "pending",
      delivery_status: "pending",
      user_id: userId || null,
      user_email: userEmail ? sanitizeInput(userEmail, 255) : null,
    });

    // If coupon was used, increment its usage count
    if (couponId) {
      const coupons = await db.select("coupons", `?id=eq.${couponId}&select=uses_count`);
      if (coupons && coupons.length > 0) {
        const newCount = (coupons[0].uses_count || 0) + 1;
        await db.update("coupons", `?id=eq.${couponId}`, { uses_count: newCount });
        console.log(`Coupon ${couponId} usage incremented to ${newCount}`);
      }
    }

    // Log order creation
    await db.log("info", `Order created: ${orderId} for ${sanitizeInput(productName, 50)}`, {
      orderId,
      productName: sanitizeInput(productName, 50),
      amount,
      minecraftUsername,
      couponId: couponId || null,
      userId: userId || null,
    });

    return res.json({
      razorpayOrderId: razorpayOrder.id,
      orderId: orderId,
      razorpayKeyId: razorpayKeyId,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ error: "Failed to create order" });
  }
}

module.exports = handleCreateOrder;
