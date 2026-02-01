/**
 * Admin Action Route Handler
 * Handles admin operations (maintenance, coupons, retry delivery, bulk email)
 */

const db = require("../lib/supabase");
const { verifyAdminToken } = require("../lib/jwt");
const { verifyPassword } = require("../lib/crypto");
const { executeRconCommand, sanitizeForRCON, sanitizeRankName } = require("../lib/rcon");
const { sendEmail } = require("../lib/email");

/**
 * Handle admin actions
 * POST /functions/v1/admin-action
 */
async function handleAdminAction(req, res) {
  // Verify admin authentication
  const { valid, payload } = verifyAdminToken(req.headers);

  if (!valid) {
    console.log("Unauthorized admin action attempt");
    return res.status(401).json({ error: "Unauthorized - invalid or missing admin token" });
  }

  console.log("Admin action authenticated:", payload?.username);

  try {
    const { action, ...params } = req.body;

    console.log("Admin action:", action, "by:", payload?.username);

    switch (action) {
      case "toggle_maintenance": {
        const value = params.value === "true" ? "true" : "false";
        await db.update("site_settings", "?key=eq.maintenance_mode", { value });
        await db.log("admin", `Maintenance mode ${value === "true" ? "enabled" : "disabled"} by ${payload?.username}`, {
          action: "toggle_maintenance",
          value,
          admin: payload?.username,
        });
        break;
      }

      case "retry_delivery": {
        const orders = await db.select("orders", `?id=eq.${params.orderId}&select=*`);
        
        if (orders && orders.length > 0) {
          const order = orders[0];
          const targetUsername = order.gift_to || order.minecraft_username;
          
          // Validate username before using in RCON command
          const safeUsername = sanitizeForRCON(targetUsername);
          if (!safeUsername || safeUsername.length < 3 || safeUsername.length > 16) {
            throw new Error("Invalid username format in order");
          }

          let command = "";

          if (order.product_type === "rank") {
            const safeRankName = sanitizeRankName(order.product_name);
            if (!safeRankName) {
              throw new Error("Invalid rank name format");
            }
            command = `lp user ${safeUsername} parent addtemp ${safeRankName} 30d`;
          } else if (order.product_type === "money") {
            const amountStr = order.product_name.replace(" In-Game Money", "");
            let amount = 0;
            if (amountStr.includes("B")) {
              amount = parseFloat(amountStr.replace("B", "")) * 1000000000;
            } else if (amountStr.includes("M")) {
              amount = parseFloat(amountStr.replace("M", "")) * 1000000;
            }
            if (isNaN(amount) || amount <= 0 || amount > 1000000000000) {
              throw new Error("Invalid amount in order");
            }
            command = `economy give ${safeUsername} ${Math.floor(amount)}`;
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
            command = `crates key give ${safeUsername} ${crateName} 1`;
          }

          const rconResult = await executeRconCommand(command);

          await db.update("orders", `?id=eq.${order.id}`, {
            payment_status: rconResult.success ? "delivered" : "paid",
            delivery_status: rconResult.success ? "delivered" : "pending",
            command_executed: command,
            error_log: rconResult.success ? null : `Retry failed: ${rconResult.error}`,
          });

          await db.log(rconResult.success ? "delivery" : "error", 
            rconResult.success 
              ? `Retry delivery successful for order ${order.order_id} by ${payload?.username}` 
              : `Retry delivery failed for order ${order.order_id}`,
            { command, rconSuccess: rconResult.success, rconResult: rconResult.result || rconResult.error, admin: payload?.username },
            order.id
          );

          if (!rconResult.success) {
            throw new Error(`RCON delivery failed: ${rconResult.error}`);
          }
        }
        break;
      }

      case "create_coupon": {
        const coupon = params.coupon;
        if (!coupon || !coupon.code || typeof coupon.code !== "string") {
          throw new Error("Invalid coupon code");
        }
        if (!["flat", "percentage"].includes(coupon.type)) {
          throw new Error("Invalid coupon type");
        }
        if (typeof coupon.value !== "number" || coupon.value < 0 || coupon.value > 10000) {
          throw new Error("Invalid coupon value");
        }

        await db.insert("coupons", {
          code: coupon.code.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 20),
          type: coupon.type,
          value: Math.floor(coupon.value),
          max_uses: Math.min(Math.max(coupon.max_uses || 100, 1), 100000),
        });

        await db.log("admin", `Coupon created: ${coupon.code} by ${payload?.username}`, {
          ...coupon,
          admin: payload?.username,
        });
        break;
      }

      case "delete_coupon": {
        if (!params.couponId) {
          throw new Error("Coupon ID required");
        }

        await db.remove("coupons", `?id=eq.${params.couponId}`);
        await db.log("admin", `Coupon deleted by ${payload?.username}`, {
          couponId: params.couponId,
          admin: payload?.username,
        });
        break;
      }

      case "update_coupon": {
        if (!params.couponId || !params.updates) {
          throw new Error("Coupon ID and updates required");
        }

        const updates = {};
        if (params.updates.code) {
          updates.code = params.updates.code.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 20);
        }
        if (params.updates.type && ["flat", "percentage"].includes(params.updates.type)) {
          updates.type = params.updates.type;
        }
        if (typeof params.updates.value === "number") {
          updates.value = Math.min(Math.max(Math.floor(params.updates.value), 0), 10000);
        }
        if (typeof params.updates.max_uses === "number") {
          updates.max_uses = Math.min(Math.max(Math.floor(params.updates.max_uses), 1), 100000);
        }

        await db.update("coupons", `?id=eq.${params.couponId}`, updates);
        await db.log("admin", `Coupon updated by ${payload?.username}`, {
          couponId: params.couponId,
          updates,
          admin: payload?.username,
        });
        break;
      }

      case "toggle_coupon_status": {
        if (!params.couponId) {
          throw new Error("Coupon ID required");
        }

        await db.update("coupons", `?id=eq.${params.couponId}`, { is_active: !!params.isActive });
        await db.log("admin", `Coupon ${params.isActive ? "activated" : "deactivated"} by ${payload?.username}`, {
          couponId: params.couponId,
          isActive: params.isActive,
          admin: payload?.username,
        });
        break;
      }

      case "increment_coupon_usage": {
        const coupons = await db.select("coupons", `?id=eq.${params.couponId}&select=uses_count`);
        if (coupons && coupons.length > 0) {
          const newCount = (coupons[0].uses_count || 0) + 1;
          await db.update("coupons", `?id=eq.${params.couponId}`, { uses_count: newCount });
        }
        break;
      }

      case "clear_data": {
        if (!params.password) {
          throw new Error("Password required");
        }

        // Fetch admin user to verify password
        const admins = await db.select("admin_users", `?id=eq.${payload?.sub}&select=password_hash`);
        
        if (!admins || admins.length === 0) {
          throw new Error("Admin not found");
        }

        const isValidPassword = await verifyPassword(params.password, admins[0].password_hash);
        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        // Check if maintenance mode is enabled
        const settings = await db.select("site_settings", "?key=eq.maintenance_mode&select=value");
        if (!settings || settings.length === 0 || settings[0].value !== "true") {
          throw new Error("Maintenance mode must be enabled to clear data");
        }

        // Clear orders, logs, active_ranks
        await db.remove("orders", "?id=neq.00000000-0000-0000-0000-000000000000");
        await db.remove("logs", "?id=neq.00000000-0000-0000-0000-000000000000");
        await db.remove("active_ranks", "?id=neq.00000000-0000-0000-0000-000000000000");

        await db.log("admin", `All data cleared by ${payload?.username}`, {
          action: "clear_data",
          admin: payload?.username,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case "send_bulk_email": {
        if (!params.subject || typeof params.subject !== "string" || params.subject.length < 1 || params.subject.length > 200) {
          throw new Error("Invalid subject (1-200 characters required)");
        }
        if (!params.message || typeof params.message !== "string" || params.message.length < 1 || params.message.length > 10000) {
          throw new Error("Invalid message (1-10000 characters required)");
        }

        // Fetch all unique user emails from orders
        const ordersWithEmails = await db.select("orders", "?user_email=not.is.null&select=user_email");
        
        // Get unique emails
        const uniqueEmails = [...new Set(
          (ordersWithEmails || [])
            .map((o) => o.user_email)
            .filter((email) => email && email.includes("@"))
        )];

        if (uniqueEmails.length === 0) {
          throw new Error("No valid email addresses found in database");
        }

        console.log(`Sending bulk email to ${uniqueEmails.length} recipients`);

        let successCount = 0;
        let failCount = 0;

        // Send emails to each recipient
        for (const email of uniqueEmails) {
          try {
            await sendEmail({
              type: "bulk",
              to: email,
              bulkData: {
                subject: params.subject,
                message: params.message,
              },
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to send email to ${email}:`, err);
            failCount++;
          }
        }

        await db.log("admin", `Bulk email sent to ${successCount} recipients by ${payload?.username}`, {
          action: "send_bulk_email",
          subject: params.subject.substring(0, 50),
          recipientCount: uniqueEmails.length,
          successCount,
          failCount,
          admin: payload?.username,
        });

        return res.json({ 
          success: true, 
          sent: successCount, 
          failed: failCount, 
          total: uniqueEmails.length 
        });
      }

      default:
        throw new Error("Unknown action");
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Admin action error:", error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = handleAdminAction;
