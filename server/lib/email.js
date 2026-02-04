/**
 * Email sending utilities
 * Uses Google Apps Script web app for sending emails
 */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzEh77d-0DaOvbT7ZEmoy3OPo-2VWfJK4KFts3EfTwv5H_kcc7fNLcdJ5aGBpkAYC2i/exec";

/**
 * Send email via Google Apps Script
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendViaAppsScript(to, subject, html) {
  try {
    console.log("Sending email via Apps Script to:", to);
    console.log("Subject:", subject);
    
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject,
        message: html,
      }),
    });

    const responseText = await response.text();
    console.log("Apps Script response:", responseText);

    if (responseText === "OK") {
      return { success: true };
    } else {
      return { success: false, error: responseText };
    }
  } catch (err) {
    console.error("Apps Script error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Generate items list HTML for bundle orders
 * @param {Array} cartItems - Cart items array
 * @returns {string}
 */
function generateItemsListHtml(cartItems) {
  if (!cartItems || cartItems.length === 0) return "";
  if (cartItems.length === 1 && cartItems[0].quantity === 1) return "";
  
  let html = `
    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px; margin-top: 16px;">
      <div style="color: #f59e0b; font-weight: 600; margin-bottom: 12px;">📦 Items in your order:</div>
  `;
  
  cartItems.forEach(item => {
    const icon = item.type === 'rank' ? '👑' : item.type === 'crate' ? '📦' : '💰';
    const qty = item.quantity > 1 ? ` × ${item.quantity}` : '';
    html += `<div style="color: #e5e5e5; padding: 4px 0;">${icon} ${item.name}${qty}</div>`;
  });
  
  html += `</div>`;
  return html;
}

/**
 * Generate receipt email HTML
 * @param {object} orderData - Order data
 * @returns {string}
 */
function generateReceiptEmail(orderData) {
  const itemsListHtml = generateItemsListHtml(orderData.cartItems);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #0a0a0b; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: bold; color: #f59e0b; }
        .card { background: #18181b; border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid #f59e0b33; }
        .success-badge { display: inline-block; background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 8px 16px; border-radius: 9999px; font-weight: 600; margin-bottom: 24px; }
        h1 { margin: 0 0 16px; font-size: 24px; color: #ffffff; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #27272a; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #a1a1aa; }
        .value { font-weight: 600; color: #ffffff; }
        .amount { color: #f59e0b; font-size: 24px; font-weight: bold; }
        .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; }
        .note { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px; margin-top: 24px; }
        .note-title { color: #f59e0b; font-weight: 600; margin-bottom: 8px; }
        .discord-btn { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000000; text-align: center; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; margin-top: 16px; }
        .divider { height: 1px; background: linear-gradient(90deg, transparent, #f59e0b, transparent); margin: 24px 0; }
        a { color: #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⚔️ Axis Economy Store</div>
          <p style="color: #a1a1aa; margin-top: 8px;">Official Store for Axis SMP</p>
        </div>
        <div class="card">
          <div class="success-badge">✓ Purchase Successful</div>
          <h1>Thank you for your purchase, ${orderData.minecraftUsername}!</h1>
          <p style="color: #a1a1aa; margin-bottom: 24px;">Your purchase has been confirmed and is being delivered to your account.</p>
          
          <div class="detail-row">
            <span class="label">Purchase ID</span>
            <span class="value" style="font-family: monospace;">${orderData.orderId}</span>
          </div>
          <div class="detail-row">
            <span class="label">Items Purchased</span>
            <span class="value" style="color: #f59e0b;">${orderData.productName}</span>
          </div>
          <div class="detail-row">
            <span class="label">Delivered To</span>
            <span class="value">${orderData.giftTo || orderData.minecraftUsername}${orderData.giftTo ? ' 🎁 (Gift)' : ''}</span>
          </div>
          <div class="detail-row">
            <span class="label">Purchase Date</span>
            <span class="value">${new Date(orderData.createdAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</span>
          </div>
          <div class="detail-row">
            <span class="label">Amount Paid</span>
            <span class="amount">₹${orderData.amount}</span>
          </div>
          
          ${itemsListHtml}
          
          <div class="divider"></div>
          
          <div class="note">
            <div class="note-title">📋 Delivery Information</div>
            <p style="margin: 0 0 8px; color: #e5e5e5;">• Items are usually delivered <strong>instantly</strong></p>
            <p style="margin: 0 0 8px; color: #e5e5e5;">• If you don't see your item, please <strong>relog from the server</strong></p>
            <p style="margin: 0; color: #e5e5e5;">• Ranks may take up to 5 minutes to activate</p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #a1a1aa; margin-bottom: 12px;">Need help? Join our Discord community!</p>
            <a href="https://discord.com/invite/f3NJw7ZJDw" class="discord-btn">💬 Join Discord Server</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin-bottom: 8px;">Thank you for supporting Axis SMP! 🎮</p>
          <p style="margin-bottom: 8px;"><a href="https://axis-sparkle-store.lovable.app">Visit Store</a> • <a href="https://discord.com/invite/f3NJw7ZJDw">Discord</a></p>
          <p>© ${new Date().getFullYear()} Axis Economy Store. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate failed payment email HTML
 * @param {object} orderData - Order data
 * @returns {string}
 */
function generateFailedEmail(orderData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #0a0a0b; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: bold; color: #f59e0b; }
        .card { background: #18181b; border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid #ef444433; }
        .failed-badge { display: inline-block; background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 8px 16px; border-radius: 9999px; font-weight: 600; margin-bottom: 24px; }
        h1 { margin: 0 0 16px; font-size: 24px; color: #ffffff; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #27272a; }
        .label { color: #a1a1aa; }
        .value { font-weight: 600; color: #ffffff; }
        .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; }
        .discord-btn { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000000; text-align: center; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; margin-top: 16px; }
        .retry-btn { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-align: center; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; margin-top: 16px; margin-right: 12px; }
        .info-box { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px; margin-top: 24px; }
        a { color: #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⚔️ Axis Economy Store</div>
          <p style="color: #a1a1aa; margin-top: 8px;">Official Store for Axis SMP</p>
        </div>
        <div class="card">
          <div class="failed-badge">✗ Payment Failed</div>
          <h1>Oops! Something went wrong</h1>
          <p style="color: #a1a1aa; margin-bottom: 24px;">Don't worry - <strong>no money was deducted</strong> from your account. You can try again!</p>
          
          <div class="detail-row">
            <span class="label">Purchase ID</span>
            <span class="value" style="font-family: monospace;">${orderData.orderId}</span>
          </div>
          <div class="detail-row">
            <span class="label">Item</span>
            <span class="value" style="color: #f59e0b;">${orderData.productName}</span>
          </div>
          <div class="detail-row">
            <span class="label">Player</span>
            <span class="value">${orderData.minecraftUsername}</span>
          </div>
          
          <div class="info-box">
            <p style="margin: 0 0 8px; color: #e5e5e5;"><strong>Why did this happen?</strong></p>
            <p style="margin: 0 0 4px; color: #a1a1aa;">• Payment was cancelled or timed out</p>
            <p style="margin: 0 0 4px; color: #a1a1aa;">• Insufficient funds in your account</p>
            <p style="margin: 0; color: #a1a1aa;">• Bank/UPI transaction declined</p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://axis-sparkle-store.lovable.app/store" class="retry-btn">🔄 Try Again</a>
            <a href="https://discord.com/invite/f3NJw7ZJDw" class="discord-btn">💬 Get Help</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin-bottom: 8px;">Need assistance? We're here to help!</p>
          <p style="margin-bottom: 8px;"><a href="https://axis-sparkle-store.lovable.app">Visit Store</a> • <a href="https://discord.com/invite/f3NJw7ZJDw">Discord</a></p>
          <p>© ${new Date().getFullYear()} Axis Economy Store. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate expiry reminder email HTML
 * @param {object} expiryData - Expiry data
 * @returns {string}
 */
function generateExpiryReminderEmail(expiryData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #0a0a0b; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: bold; color: #f59e0b; }
        .card { background: #18181b; border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid #f59e0b33; }
        .warning-badge { display: inline-block; background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 8px 16px; border-radius: 9999px; font-weight: 600; margin-bottom: 24px; }
        h1 { margin: 0 0 16px; font-size: 24px; color: #ffffff; }
        .countdown { font-size: 72px; font-weight: bold; color: #f59e0b; text-align: center; margin: 24px 0; text-shadow: 0 0 20px rgba(245, 158, 11, 0.5); }
        .countdown-label { text-align: center; color: #a1a1aa; margin-bottom: 24px; font-size: 18px; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #27272a; }
        .label { color: #a1a1aa; }
        .value { font-weight: 600; color: #ffffff; }
        .cta-button { display: block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000000; text-align: center; padding: 18px 32px; border-radius: 12px; font-weight: 700; font-size: 18px; text-decoration: none; margin-top: 24px; }
        .benefits { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; margin-top: 24px; }
        .benefits-title { color: #f59e0b; font-weight: 600; margin-bottom: 12px; font-size: 16px; }
        .benefit-item { color: #e5e5e5; padding: 6px 0; }
        .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; }
        .sad-emoji { font-size: 56px; text-align: center; margin-bottom: 16px; }
        .discord-link { display: inline-block; color: #f59e0b; margin-top: 12px; }
        a { color: #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⚔️ Axis Economy Store</div>
          <p style="color: #a1a1aa; margin-top: 8px;">Official Store for Axis SMP</p>
        </div>
        <div class="card">
          <div class="sad-emoji">😢</div>
          <div class="warning-badge">⏰ Time is Running Out!</div>
          <h1>Hey ${expiryData.minecraftUsername}!</h1>
          <p style="color: #a1a1aa; margin-bottom: 8px;">We noticed your <strong style="color: #f59e0b;">${expiryData.rankName}</strong> rank is about to expire...</p>
          <p style="color: #a1a1aa; margin-bottom: 8px;">Don't let your hard-earned perks disappear! 💔</p>
          
          <div class="countdown">${expiryData.daysLeft}</div>
          <div class="countdown-label">days remaining until your rank expires!</div>
          
          <div class="detail-row">
            <span class="label">Your Rank</span>
            <span class="value" style="color: #f59e0b;">${expiryData.rankName}</span>
          </div>
          <div class="detail-row">
            <span class="label">Player</span>
            <span class="value">${expiryData.minecraftUsername}</span>
          </div>
          <div class="detail-row">
            <span class="label">Expires On</span>
            <span class="value" style="color: #ef4444;">${new Date(expiryData.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'full' })}</span>
          </div>
          
          <div class="benefits">
            <div class="benefits-title">🎮 You'll lose access to:</div>
            <div class="benefit-item">✨ Exclusive commands & special abilities</div>
            <div class="benefit-item">🎁 Daily rewards & bonus items</div>
            <div class="benefit-item">⚡ Priority queue & fast access</div>
            <div class="benefit-item">👑 VIP status & exclusive chat perks</div>
            <div class="benefit-item">🏆 Special cosmetics & effects</div>
          </div>
          
          <a href="https://axis-sparkle-store.lovable.app/store" class="cta-button">
            🔥 Renew Now & Keep Your Perks! 🔥
          </a>
          
          <p style="color: #71717a; text-align: center; margin-top: 16px; font-size: 14px;">
            We'd hate to see you lose your rank! Renew today and keep dominating. 💪
          </p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://discord.com/invite/f3NJw7ZJDw" class="discord-link">💬 Questions? Chat with us on Discord</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin-bottom: 8px;">Axis Economy Store - Premium Minecraft Ranks & Items</p>
          <p>© ${new Date().getFullYear()} Axis SMP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate bulk email HTML
 * @param {object} bulkData - Bulk email data
 * @returns {string}
 */
function generateBulkEmail(bulkData) {
  // Convert newlines to <br> for HTML
  const htmlMessage = bulkData.message.replace(/\n/g, "<br>");
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #0a0a0b; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: bold; color: #f59e0b; }
        .card { background: #18181b; border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid #f59e0b33; }
        h1 { margin: 0 0 24px; font-size: 24px; color: #ffffff; }
        .content { color: #e5e5e5; line-height: 1.6; }
        .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000000; text-align: center; padding: 14px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; margin-top: 24px; }
        a { color: #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⚔️ Axis Economy Store</div>
          <p style="color: #a1a1aa; margin-top: 8px;">Official Store for Axis SMP</p>
        </div>
        <div class="card">
          <h1>${bulkData.subject}</h1>
          <div class="content">${htmlMessage}</div>
          <div style="text-align: center;">
            <a href="https://axis-sparkle-store.lovable.app/store" class="cta-button">🛒 Visit Store</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin-bottom: 8px;">You're receiving this because you made a purchase at Axis Economy Store.</p>
          <p style="margin-bottom: 8px;"><a href="https://axis-sparkle-store.lovable.app">Visit Store</a> • <a href="https://discord.com/invite/f3NJw7ZJDw">Discord</a></p>
          <p>© ${new Date().getFullYear()} Axis Economy Store. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send an email based on type
 * @param {object} emailRequest - Email request object
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendEmail(emailRequest) {
  const { type, to, orderData, expiryData, bulkData } = emailRequest;
  
  let subject = "";
  let html = "";
  
  switch (type) {
    case "receipt":
      if (!orderData) return { success: false, error: "Order data required" };
      subject = `✅ Purchase Confirmed - ${orderData.productName}`;
      html = generateReceiptEmail(orderData);
      break;
    
    case "failed":
      if (!orderData) return { success: false, error: "Order data required" };
      subject = `❌ Purchase Failed - ${orderData.productName}`;
      html = generateFailedEmail(orderData);
      break;
    
    case "expiry_reminder":
      if (!expiryData) return { success: false, error: "Expiry data required" };
      subject = `😢 Missing Your ${expiryData.rankName} Rank? Only ${expiryData.daysLeft} Days Left!`;
      html = generateExpiryReminderEmail(expiryData);
      break;
    
    case "bulk":
      if (!bulkData) return { success: false, error: "Bulk data required" };
      subject = bulkData.subject;
      html = generateBulkEmail(bulkData);
      break;
    
    default:
      return { success: false, error: "Unknown email type" };
  }
  
  return sendViaAppsScript(to, subject, html);
}

module.exports = {
  sendEmail,
  sendViaAppsScript,
  generateReceiptEmail,
  generateFailedEmail,
  generateExpiryReminderEmail,
  generateBulkEmail,
};
