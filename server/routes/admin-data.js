/**
 * Admin Data Route Handler
 * Fetches admin panel data (orders, logs, coupons, settings)
 */

const db = require("../lib/supabase");
const { verifyAdminToken } = require("../lib/jwt");

/**
 * Handle admin data fetch
 * POST /functions/v1/admin-data
 */
async function handleAdminData(req, res) {
  // Verify admin authentication
  const { valid, payload } = verifyAdminToken(req.headers);

  if (!valid) {
    console.log("Unauthorized admin data access attempt");
    return res.status(401).json({ error: "Unauthorized - invalid or missing admin token" });
  }

  console.log("Admin data request authenticated:", payload?.username);

  try {
    const { dataType } = req.body;

    console.log("Admin fetching data type:", dataType);

    switch (dataType) {
      case "orders": {
        const data = await db.select("orders", "?select=*&order=created_at.desc&limit=500");
        return res.json({ success: true, data });
      }
      
      case "logs": {
        const data = await db.select("logs", "?select=*&order=created_at.desc&limit=500");
        return res.json({ success: true, data });
      }
      
      case "coupons": {
        const data = await db.select("coupons", "?select=*&order=created_at.desc");
        return res.json({ success: true, data });
      }
      
      case "settings": {
        const data = await db.select("site_settings", "?select=*");
        return res.json({ success: true, data });
      }
      
      case "all": {
        // Fetch all data types in parallel
        const [orders, logs, coupons, settings] = await Promise.all([
          db.select("orders", "?select=*&order=created_at.desc&limit=500"),
          db.select("logs", "?select=*&order=created_at.desc&limit=500"),
          db.select("coupons", "?select=*&order=created_at.desc"),
          db.select("site_settings", "?select=*"),
        ]);

        return res.json({
          success: true,
          data: { orders, logs, coupons, settings },
        });
      }
      
      default:
        return res.status(400).json({ error: "Invalid data type requested" });
    }
  } catch (err) {
    console.error("Admin data fetch error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch admin data" });
  }
}

module.exports = handleAdminData;
