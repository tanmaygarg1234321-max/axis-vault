/**
 * Check Rank Expiry Route Handler
 * CRON job for rank expiry and reminders
 */

const db = require("../lib/supabase");
const { executeRconCommand } = require("../lib/rcon");
const { sendEmail } = require("../lib/email");

/**
 * Handle rank expiry check
 * POST /functions/v1/check-rank-expiry
 */
async function handleCheckRankExpiry(req, res) {
  try {
    console.log("=== Rank Expiry Check Started ===");
    console.log("Time:", new Date().toISOString());

    const now = new Date();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const utcMidnightMs = (d) =>
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

    // Fetch all active ranks
    const activeRanks = await db.select("active_ranks", "?is_active=eq.true&select=*");
    console.log(`Found ${activeRanks?.length || 0} active ranks`);

    if (!activeRanks || activeRanks.length === 0) {
      return res.json({ success: true, message: "No active ranks to process" });
    }

    const expiredRanks = [];
    const remindersSent = [];

    for (const rank of activeRanks) {
      const expiresAt = new Date(rank.expires_at);
      const daysLeft = Math.floor((utcMidnightMs(expiresAt) - utcMidnightMs(now)) / MS_PER_DAY);

      console.log(`Processing rank: ${rank.rank_name} for ${rank.minecraft_username}, expires: ${expiresAt.toISOString()}, days left: ${daysLeft}`);

      // Check if expired
      if (expiresAt <= now) {
        console.log(`Rank EXPIRED: ${rank.rank_name} for ${rank.minecraft_username}`);

        // Remove rank via RCON
        const command = `lp user ${rank.minecraft_username} parent removetemp ${rank.rank_name}`;
        const rconResult = await executeRconCommand(command);
        
        if (rconResult.success) {
          expiredRanks.push(`${rank.minecraft_username} - ${rank.rank_name}`);

          await db.log("rcon", `Rank expired and removed: ${rank.rank_name} from ${rank.minecraft_username}`, 
            { command, result: rconResult.result, expiresAt: rank.expires_at },
            rank.order_id
          );
        } else {
          console.error(`Failed to remove rank for ${rank.minecraft_username}:`, rconResult.error);

          await db.log("error", `Failed to remove expired rank ${rank.rank_name} from ${rank.minecraft_username}`,
            { error: rconResult.error },
            rank.order_id
          );
        }

        // Mark rank as inactive
        await db.update("active_ranks", `?id=eq.${rank.id}`, {
          is_active: false,
          removed_at: now.toISOString(),
        });

      } else if (daysLeft === 2) {
        // Send reminder email exactly 2 days before expiry
        if (rank.order_id) {
          const orders = await db.select("orders", `?id=eq.${rank.order_id}&select=user_email,minecraft_username`);

          if (orders && orders.length > 0 && orders[0].user_email) {
            await sendEmail({
              type: "expiry_reminder",
              to: orders[0].user_email,
              expiryData: {
                rankName: rank.rank_name,
                minecraftUsername: rank.minecraft_username,
                daysLeft: daysLeft,
                expiresAt: rank.expires_at,
              },
            });

            remindersSent.push(`${rank.minecraft_username} - ${daysLeft} days left`);

            await db.log("info", `Expiry reminder sent: ${rank.rank_name} for ${rank.minecraft_username} (${daysLeft} days left)`,
              { daysLeft, expiresAt: rank.expires_at, email: orders[0].user_email },
              rank.order_id
            );
          }
        }
      }
    }

    const summary = {
      success: true,
      processedAt: now.toISOString(),
      totalActiveRanks: activeRanks.length,
      expiredRanksRemoved: expiredRanks.length,
      expiredRanks,
      remindersSent: remindersSent.length,
      reminders: remindersSent,
    };

    console.log("=== Rank Expiry Check Complete ===");
    console.log(JSON.stringify(summary, null, 2));

    // Log the job run
    await db.log("admin", `Rank expiry check: ${expiredRanks.length} removed, ${remindersSent.length} reminders sent`, summary);

    return res.json(summary);
  } catch (error) {
    console.error("Rank expiry check error:", error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = handleCheckRankExpiry;
