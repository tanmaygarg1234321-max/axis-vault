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
      if (order.product_type === "rank") {
        const safeRankName = sanitizeRankName(order.product_name);
        if (!safeRankName) {
          throw new Error("Invalid rank name format");
        }
        
        command = `lp user ${safeUsername} parent addtemp ${safeRankName} 30d`;
        
        const rconResult = await executeRconCommand(command);
        
        if (rconResult.success) {
          await db.log("rcon", `RCON command executed: ${command}`, { command, result: rconResult.result }, order.id);
        }

        // Store active rank for expiry tracking (30 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await db.insert("active_ranks", {
          order_id: order.id,
          minecraft_username: safeUsername,
          rank_name: safeRankName,
          expires_at: expiresAt.toISOString(),
        });

        console.log(`Rank ${safeRankName} granted to ${safeUsername} until ${expiresAt}`);
        deliverySuccess = rconResult.success;
        if (!rconResult.success) {
          errorLog = rconResult.error;
        }

      } else if (order.product_type === "money") {
        const amountStr = order.product_name.replace(" In-Game Money", "");
        let amount = 0;
        if (amountStr.includes("B")) {
          amount = parseFloat(amountStr.replace("B", "")) * 1000000000;
        } else if (amountStr.includes("M")) {
          amount = parseFloat(amountStr.replace("M", "")) * 1000000;
        }

        if (isNaN(amount) || amount <= 0 || amount > 1000000000000) {
          throw new Error("Invalid amount format");
        }

        command = `economy give ${safeUsername} ${Math.floor(amount)}`;
        
        const rconResult = await executeRconCommand(command);
        
        if (rconResult.success) {
          await db.log("rcon", `RCON command executed: ${command}`, { command, result: rconResult.result }, order.id);
        }
        
        console.log(`Money command: ${command}`);
        deliverySuccess = rconResult.success;
        if (!rconResult.success) {
          errorLog = rconResult.error;
        }

      } else if (order.product_type === "crate") {
        const crateNameMap = {
          "astix crate": "astix",
          "void crate": "void",
          "spawner crate": "spawner",
          "money crate": "money",
          "keyall crate": "keyall",
          "mythic crate": "mythic",
          "keyall-crate crate": "keyall",
          "money-crate crate": "money",
          "astro-crate crate": "astro",
          "moon-crate crate": "moon",
        };
        
        const productLower = order.product_name.toLowerCase();
        const crateName = crateNameMap[productLower] || sanitizeForRCON(order.product_name.replace(/ Crate$/i, "").toLowerCase());
        
        if (!crateName) {
          throw new Error("Invalid crate name format");
        }
        
        command = `crates key give ${safeUsername} ${crateName} 1`;
        
        const rconResult = await executeRconCommand(command);
        
        if (rconResult.success) {
          await db.log("rcon", `RCON command executed: ${command}`, { command, result: rconResult.result }, order.id);
        }
        
        console.log(`Crate delivery: ${command}`);
        deliverySuccess = rconResult.success;
        if (!rconResult.success) {
          errorLog = rconResult.error;
        }
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
