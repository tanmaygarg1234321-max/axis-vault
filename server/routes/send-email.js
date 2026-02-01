/**
 * Send Email Route Handler
 * Sends emails via Google Apps Script
 */

const db = require("../lib/supabase");
const { sendEmail } = require("../lib/email");

/**
 * Handle email sending
 * POST /functions/v1/send-email
 */
async function handleSendEmail(req, res) {
  try {
    const { type, to, orderData, expiryData, bulkData } = req.body;

    console.log("Email request:", { type, to, hasOrderData: !!orderData, hasExpiryData: !!expiryData, hasBulkData: !!bulkData });

    const result = await sendEmail({ type, to, orderData, expiryData, bulkData });

    // Log email event
    const orderId = orderData?.orderId ? 
      (await db.select("orders", `?order_id=eq.${encodeURIComponent(orderData.orderId)}&select=id`))?.[0]?.id : 
      null;
    
    await db.log(result.success ? "email_sent" : "email_error", 
      `Email ${type} to ${to}: ${result.success ? "Success" : "Failed"}`,
      { emailType: type, recipient: to, details: result.error || "OK", success: result.success },
      orderId
    );

    if (result.success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: result.error || "Failed to send email" });
    }
  } catch (error) {
    console.error("Send email error:", error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = handleSendEmail;
