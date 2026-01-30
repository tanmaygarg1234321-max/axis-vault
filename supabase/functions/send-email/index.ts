import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.5.2/mod.ts";

// CORS configuration with origin validation
const ALLOWED_ORIGINS = [
  'https://preview--jeqsesqlkjklhyvszpgg.lovable.app',
  'https://jeqsesqlkjklhyvszpgg.lovable.app',
  'https://id-preview--2c705b12-7ee5-450c-8faa-9ab7ac9e2bcd.lovable.app',
  'https://axis-sparkle-store.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface EmailRequest {
  type: "receipt" | "failed" | "expiry_reminder";
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
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, orderData, expiryData }: EmailRequest = await req.json();

    // Gmail SMTP credentials
    const gmailUser = Deno.env.get("GMAIL_SMTP_USER");
    const gmailPassword = Deno.env.get("GMAIL_SMTP_PASSWORD");
    const senderEmail = gmailUser || "axiseconomy@gmail.com";

    console.log("Email request:", { type, to, hasOrderData: !!orderData, hasExpiryData: !!expiryData });
    console.log("Sender email:", senderEmail);

    if (!gmailUser || !gmailPassword) {
      console.error("GMAIL_SMTP_USER or GMAIL_SMTP_PASSWORD not configured");
      throw new Error("Email service not configured");
    }

    let subject = "";
    let html = "";

    if (type === "receipt" && orderData) {
      subject = `✅ Payment Confirmed - ${orderData.productName}`;
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
              <div class="success-badge">✓ Payment Successful</div>
              <h1>Thank you for your purchase!</h1>
              <p style="color: #a1a1aa; margin-bottom: 24px;">Your order has been confirmed and delivered.</p>
              
              <div class="detail-row">
                <span class="label">Order ID</span>
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
      subject = `❌ Payment Failed - ${orderData.productName}`;
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
            .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚔️ Axis Economy Store</div>
            </div>
            <div class="card">
              <div class="failed-badge">✗ Payment Failed</div>
              <h1>Your payment could not be processed</h1>
              <p style="color: #a1a1aa; margin-bottom: 24px;">Don't worry - no money was deducted from your account.</p>
              
              <div class="detail-row">
                <span class="label">Order ID</span>
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
      subject = `⏰ Your ${expiryData.rankName} Rank expires in ${expiryData.daysLeft} days!`;
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
            .countdown { font-size: 48px; font-weight: bold; color: #f59e0b; text-align: center; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #27272a; }
            .label { color: #a1a1aa; }
            .value { font-weight: 600; }
            .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; }
            .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚔️ Axis Economy Store</div>
            </div>
            <div class="card">
              <div class="warning-badge">⏰ Expiry Reminder</div>
              <h1>Your rank is expiring soon!</h1>
              
              <div class="countdown">${expiryData.daysLeft} days left</div>
              
              <div class="detail-row">
                <span class="label">Rank</span>
                <span class="value">${expiryData.rankName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Player</span>
                <span class="value">${expiryData.minecraftUsername}</span>
              </div>
              <div class="detail-row">
                <span class="label">Expires On</span>
                <span class="value">${new Date(expiryData.expiresAt).toLocaleDateString()}</span>
              </div>
              
              <p style="color: #a1a1aa; margin-top: 24px; text-align: center;">Renew your rank to keep enjoying your perks!</p>
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
      throw new Error("Invalid email request payload");
    }

    console.log("Sending email with subject:", subject);
    console.log("To:", to);

    // Send email via Gmail SMTP. Uses port 587 (STARTTLS).
    const smtpHost = "smtp.gmail.com";
    const smtpPort = 587;

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: false, // STARTTLS will upgrade
        auth: {
          username: gmailUser,
          password: gmailPassword,
        },
      },
    });

    try {
      await client.send({
        from: `Axis Economy Store <${senderEmail}>`,
        to,
        subject,
        content: `Axis Economy Store\n\n${subject}`,
        html,
      });
      console.log("Email sent successfully via SMTP");
    } finally {
      await client.close();
    }

    return new Response(JSON.stringify({ success: true, messageId: "smtp" }), {
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
