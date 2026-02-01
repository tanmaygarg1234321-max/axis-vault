/**
 * Express.js Server for Axis Economy Store
 * Replaces Supabase Edge Functions for VPS/Pterodactyl deployment
 */

require("dotenv").config();

const express = require("express");
const path = require("path");
const { corsMiddleware } = require("./lib/cors");

// Import route handlers
const handleAdminLogin = require("./routes/admin-login");
const handleAdminData = require("./routes/admin-data");
const handleAdminAction = require("./routes/admin-action");
const handleCreateOrder = require("./routes/create-order");
const handleVerifyPayment = require("./routes/verify-payment");
const handleSendEmail = require("./routes/send-email");
const handleCheckRankExpiry = require("./routes/check-rank-expiry");

const app = express();
const PORT = process.env.PORT || 24611;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(corsMiddleware);

// Trust proxy for rate limiting (X-Forwarded-For header)
app.set("trust proxy", 1);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes - Match Edge Function paths
app.post("/functions/v1/admin-login", handleAdminLogin);
app.post("/functions/v1/admin-data", handleAdminData);
app.post("/functions/v1/admin-action", handleAdminAction);
app.post("/functions/v1/create-order", handleCreateOrder);
app.post("/functions/v1/verify-payment", handleVerifyPayment);
app.post("/functions/v1/send-email", handleSendEmail);
app.post("/functions/v1/check-rank-expiry", handleCheckRankExpiry);

// Serve static files from dist folder (after build)
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

// SPA fallback - serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Axis Economy Store - Express Server              ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on port: ${PORT}                            ║
║  Environment: ${process.env.NODE_ENV || "development"}                              ║
║  Static files: ${distPath}  ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Check required environment variables
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_JWT_SECRET",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
  ];
  
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn("⚠️  Missing environment variables:", missing.join(", "));
  } else {
    console.log("✅ All required environment variables are set");
  }
  
  // Check optional RCON config
  if (!process.env.RCON_HOST || !process.env.RCON_PASSWORD) {
    console.warn("⚠️  RCON not configured - delivery will be pending");
  } else {
    console.log("✅ RCON configured for", process.env.RCON_HOST);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down...");
  process.exit(0);
});
