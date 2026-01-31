import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzEh77d-0DaOvbT7ZEmoy3OPo-2VWfJK4KFts3EfTwv5H_kcc7fNLcdJ5aGBpkAYC2i/exec";

interface EmailRequest {
  type: "receipt" | "failed" | "expiry_reminder" | "bulk";
  to: string;
  orderData?: {
    orderId: string;
    productName: string;
    amount: number;
    minecraftUsername: string;
    giftTo?: string;
    createdAt: string;
  };
  expiryData?: {
    rankName: string;
    minecraftUsername: string;
    daysLeft: number;
    expiresAt: string;
  };
  bulkData?: {
    subject: string;
    message: string;
  };
}

// Helper to log email events to database
async function logEmailEvent(
  supabaseUrl: string,
  serviceRoleKey: string,
  type: string,
  to: string,
  success: boolean,
  details: string,
  orderId?: string
) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        type: success ? "email_sent" : "email_error",
        message: `Email ${type} to ${to}: ${success ? "Success" : "Failed"}`,
        metadata: { emailType: type, recipient: to, details, success },
        order_id: orderId || null,
      }),
    });
  } catch (e) {
    console.error("Failed to log email event:", e);
  }
}

// Send email via Google Apps Script (fire and forget - don't wait)
async function sendViaAppsScript(to: string, subject: string, message: string): Promise<{ success: boolean; error?: string }> {
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
        message,
      }),
    });

    const responseText = await response.text();
    console.log("Apps Script response:", responseText);

    if (responseText === "OK") {
      return { success: true };
    } else {
      return { success: false, error: responseText };
    }
  } catch (err: any) {
    console.error("Apps Script error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  try {
    const { type, to, orderData, expiryData, bulkData }: EmailRequest = await req.json();

    console.log("Email request:", { type, to, hasOrderData: !!orderData, hasExpiryData: !!expiryData, hasBulkData: !!bulkData });

    let subject = "";
    let html = "";

    if (type === "receipt" && orderData) {
      subject = `✅ Purchase Confirmed - ${orderData.productName}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #0a0a0b; color: #ffffff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 28px; font-weight: bold; color: #10b981; }
            .card { background: #18181b; border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid #27272a; }
            .success-badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 8px 16px; border-radius: 9999px; font-weight: 600; margin-bottom: 24px; }
            h1 { margin: 0 0 16px; font-size: 24px; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #27272a; }
            .detail-row:last-child { border-bottom: none; }
            .label { color: #a1a1aa; }
            .value { font-weight: 600; }
            .amount { color: #10b981; font-size: 24px; font-weight: bold; }
            .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; }
            .note { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 16px; margin-top: 24px; }
            .note-title { color: #60a5fa; font-weight: 600; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚔️ Axis Economy Store</div>
            </div>
            <div class="card">
              <div class="success-badge">✓ Purchase Successful</div>
              <h1>Thank you for your purchase!</h1>
              <p style="color: #a1a1aa; margin-bottom: 24px;">Your purchase has been confirmed and delivered.</p>
              
              <div class="detail-row">
                <span class="label">Purchase ID</span>
                <span class="value" style="font-family: monospace;">${orderData.orderId}</span>
              </div>
              <div class="detail-row">
                <span class="label">Item</span>
                <span class="value">${orderData.productName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Minecraft Username</span>
                <span class="value">${orderData.giftTo || orderData.minecraftUsername}${orderData.giftTo ? ' (Gift)' : ''}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date</span>
                <span class="value">${new Date(orderData.createdAt).toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span class="label">Amount Paid</span>
                <span class="amount">₹${orderData.amount}</span>
              </div>
              
              <div class="note">
                <div class="note-title">📋 Important</div>
                <p style="margin: 0; color: #a1a1aa;">If you don't see your item in-game, please relog from the server. Items are usually delivered instantly!</p>
              </div>
            </div>
            <div class="footer">
              <p>Questions? Contact us on Discord</p>
              <p>© 2024 Axis Economy Store. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "failed" && orderData) {
      subject = `❌ Purchase Failed - ${orderData.productName}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #0a0a0b; color: #ffffff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 28px; font-weight: bold; color: #10b981; }
            .card { background: #18181b; border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid #27272a; }
            .failed-badge { display: inline-block; background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 8px 16px; border-radius: 9999px; font-weight: 600; margin-bottom: 24px; }
            h1 { margin: 0 0 16px; font-size: 24px; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #27272a; }
            .label { color: #a1a1aa; }
            .value { font-weight: 600; }
            .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚔️ Axis Economy Store</div>
            </div>
            <div class="card">
              <div class="failed-badge">✗ Purchase Failed</div>
              <h1>Your payment could not be processed</h1>
              <p style="color: #a1a1aa; margin-bottom: 24px;">Don't worry - no money was deducted from your account.</p>
              
              <div class="detail-row">
                <span class="label">Purchase ID</span>
                <span class="value" style="font-family: monospace;">${orderData.orderId}</span>
              </div>
              <div class="detail-row">
                <span class="label">Item</span>
                <span class="value">${orderData.productName}</span>
              </div>
              
              <p style="color: #a1a1aa; margin-top: 24px;">Please try again or contact support if you continue facing issues.</p>
            </div>
            <div class="footer">
              <p>Need help? Join our Discord for support</p>
              <p>© 2024 Axis Economy Store. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "expiry_reminder" && expiryData) {
      subject = `😢 Missing Your ${expiryData.rankName} Rank? Only ${expiryData.daysLeft} Days Left!`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #0a0a0b; color: #ffffff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 28px; font-weight: bold; color: #10b981; }
            .card { background: #18181b; border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid #27272a; }
            .warning-badge { display: inline-block; background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 8px 16px; border-radius: 9999px; font-weight: 600; margin-bottom: 24px; }
            h1 { margin: 0 0 16px; font-size: 24px; }
            .countdown { font-size: 64px; font-weight: bold; color: #f59e0b; text-align: center; margin: 24px 0; }
            .countdown-label { text-align: center; color: #a1a1aa; margin-bottom: 24px; font-size: 18px; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #27272a; }
            .label { color: #a1a1aa; }
            .value { font-weight: 600; }
            .cta-button { display: block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-align: center; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 18px; text-decoration: none; margin-top: 24px; }
            .benefits { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 20px; margin-top: 24px; }
            .benefits-title { color: #10b981; font-weight: 600; margin-bottom: 12px; font-size: 16px; }
            .benefit-item { color: #a1a1aa; padding: 6px 0; }
            .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; }
            .sad-emoji { font-size: 48px; text-align: center; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚔️ Axis Economy Store</div>
            </div>
            <div class="card">
              <div class="sad-emoji">😢</div>
              <div class="warning-badge">⏰ Time is Running Out!</div>
              <h1>Hey ${expiryData.minecraftUsername}!</h1>
              <p style="color: #a1a1aa; margin-bottom: 8px;">Your <strong style="color: #10b981;">${expiryData.rankName}</strong> rank is about to expire...</p>
              
              <div class="countdown">${expiryData.daysLeft}</div>
              <div class="countdown-label">days left until you lose your perks! 💔</div>
              
              <div class="detail-row">
                <span class="label">Rank</span>
                <span class="value" style="color: #10b981;">${expiryData.rankName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Player</span>
                <span class="value">${expiryData.minecraftUsername}</span>
              </div>
              <div class="detail-row">
                <span class="label">Expires On</span>
                <span class="value" style="color: #f59e0b;">${new Date(expiryData.expiresAt).toLocaleDateString()}</span>
              </div>
              
              <div class="benefits">
                <div class="benefits-title">🎮 Don't miss out on these perks:</div>
                <div class="benefit-item">✨ Exclusive commands & abilities</div>
                <div class="benefit-item">🎁 Special in-game rewards</div>
                <div class="benefit-item">⚡ Priority access & bonuses</div>
                <div class="benefit-item">👑 VIP status in the community</div>
              </div>
              
              <a href="https://axis-sparkle-store.lovable.app/store" class="cta-button">
                🔥 Renew Now & Keep Your Perks! 🔥
              </a>
              
              <p style="color: #71717a; text-align: center; margin-top: 16px; font-size: 14px;">
                We'd hate to see you go! Renew today and continue dominating. 💪
              </p>
            </div>
            <div class="footer">
              <p>© 2024 Axis Economy Store. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "bulk" && bulkData) {
      subject = bulkData.subject;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #0a0a0b; color: #ffffff; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 28px; font-weight: bold; color: #10b981; }
            .card { background: #18181b; border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid #27272a; }
            .content { color: #e5e5e5; line-height: 1.6; }
            .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚔️ Axis Economy Store</div>
            </div>
            <div class="card">
              <div class="content">
                ${bulkData.message}
              </div>
            </div>
            <div class="footer">
              <p>© 2024 Axis Economy Store. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    if (!subject || !html) {
      await logEmailEvent(supabaseUrl, serviceRoleKey, type, to, false, "Invalid email request payload");
      throw new Error("Invalid email request payload");
    }

    console.log("Sending email with subject:", subject);
    console.log("To:", to);

    // Send via Google Apps Script
    const result = await sendViaAppsScript(to, subject, html);

    console.log("Apps Script result:", result);

    if (!result.success) {
      console.error("Apps Script error:", result.error);
      await logEmailEvent(supabaseUrl, serviceRoleKey, type, to, false, result.error || "Apps Script error", orderData?.orderId);
      throw new Error(result.error || "Failed to send email");
    }

    // Log success
    await logEmailEvent(supabaseUrl, serviceRoleKey, type, to, true, "Email sent via Google Apps Script", orderData?.orderId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Send email error:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
