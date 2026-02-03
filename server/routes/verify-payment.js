/**
 * Verify Payment Route Handler
 * Verifies Razorpay payment and delivers items via RCON
 */

const crypto = require("crypto");
const db = require("../lib/supabase");
const { executeRconCommand, validateMinecraftUsername, sanitizeForRCON, sanitizeRankName } = require("../lib/rcon");
const { sendEmail } = require("../lib/email");

/**
 * Handle payment verification
 * POST /functions/v1/verify-payment
 */
async function handleVerifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    console.log("Verifying payment:", { razorpay_order_id, razorpay_payment_id, orderId });

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error("Payment gateway not configured");
    }
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      throw new Error("Payment verification failed");
    }

    console.log("Signature verified successfully");

    // Fetch order details
    const orders = await db.select("orders", `?order_id=eq.${encodeURIComponent(orderId)}&select=*`);

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
    await db.update("orders", `?id=eq.${order.id}`, {
      razorpay_payment_id: razorpay_payment_id,
      payment_status: "paid",
    });

    // Log payment success
    await db.log("payment", `Payment verified for order ${orderId}`, { razorpay_payment_id }, order.id);

    // Process delivery with RCON
    let command = "";
    let deliverySuccess = false;
    let errorLog = "";

    try {
      // Parse cart items from order if available
      let cartItems = [];
      try {
        if (order.error_log && order.error_log.startsWith('{')) {
          const parsed = JSON.parse(order.error_log);
          if (parsed.cartItems) {
            cartItems = parsed.cartItems;
          }
        }
      } catch (e) {
        // Not JSON, treat as single product
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

      // Process each item
      const commands = [];
      for (const item of cartItems) {
        for (let i = 0; i < item.quantity; i++) {
          if (item.type === "rank") {
            // /lp user <username> parent addtemp <rank> 30d
            const rankName = item.name.replace(/ Rank$/i, "");
            const safeRankName = sanitizeForRCON(rankName);
            if (safeRankName) {
              commands.push(`lp user ${safeUsername} parent addtemp ${safeRankName} 30d`);
              
              // Store active rank for expiry tracking
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 30);
              await db.insert("active_ranks", {
                order_id: order.id,
                minecraft_username: safeUsername,
                rank_name: safeRankName,
                expires_at: expiresAt.toISOString(),
              });
            }
          } else if (item.type === "crate") {
            // /crates giveKey <cratename> <username> <qty>
            const crateCommandMap = {
              "keyall crate": "keall_crate",
              "money crate": "Moneycrate",
              "astro crate": "astro_crate",
              "moon crate": "Moon_crate",
            };
            const crateLower = item.name.toLowerCase();
            const crateName = crateCommandMap[crateLower] || sanitizeForRCON(item.name.replace(/ Crate$/i, ""));
            if (crateName) {
              commands.push(`crates giveKey ${crateName} ${safeUsername} 1`);
            }
          } else if (item.type === "money") {
            // Money delivery - skip for now as requested
            console.log(`Money delivery skipped for ${item.name}`);
          }
        }
      }

      // Execute all RCON commands
      for (const cmd of commands) {
        const rconResult = await executeRconCommand(cmd);
        if (rconResult.success) {
          await db.log("rcon", `RCON command executed: ${cmd}`, { command: cmd, result: rconResult.result }, order.id);
          deliverySuccess = true;
        } else {
          errorLog = rconResult.error || "RCON command failed";
          await db.log("error", `RCON command failed: ${cmd}`, { command: cmd, error: errorLog }, order.id);
        }
        command = cmd; // Store last command
      }

      if (commands.length === 0) {
        deliverySuccess = true; // No commands needed (e.g., money only)
      }

      // Determine delivery status
      const finalDeliveryStatus = deliverySuccess ? "delivered" : "pending";
      const finalPaymentStatus = deliverySuccess ? "delivered" : "paid";

      // Update order with delivery status and command
      await db.update("orders", `?id=eq.${order.id}`, {
        payment_status: finalPaymentStatus,
        delivery_status: finalDeliveryStatus,
        command_executed: command,
        error_log: !deliverySuccess ? (errorLog || "RCON not connected - pending manual delivery") : null,
      });

      // Log delivery
      await db.log(deliverySuccess ? "delivery" : "info", 
        deliverySuccess 
          ? `Delivered ${order.product_name} to ${safeUsername}` 
          : `Order ${orderId} pending delivery - RCON not available`,
        { command, rconConnected: deliverySuccess },
        order.id
      );

      // Send success email if user has email
      if (order.user_email) {
        await sendEmail({
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

    } catch (deliveryError) {
      console.error("Delivery error:", deliveryError);
      errorLog = deliveryError.message;

      await db.update("orders", `?id=eq.${order.id}`, {
        delivery_status: "pending",
        command_executed: command,
        error_log: errorLog,
      });

      await db.log("error", `Delivery failed for order ${orderId}: ${errorLog}`, { command, error: errorLog }, order.id);
    }

    return res.json({ success: true, delivered: deliverySuccess });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = handleVerifyPayment;
