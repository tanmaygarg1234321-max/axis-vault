import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
  const isAllowed =
    origin &&
    ALLOWED_ORIGINS.some(
      (allowed) =>
        origin === allowed ||
        origin.endsWith(".lovable.app") ||
        origin.endsWith(".lovableproject.com") ||
        origin.endsWith(".lovable.dev")
    );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// RCON client for Minecraft server
class RCONClient {
  private host: string;
  private port: number;
  private password: string;
  private conn: Deno.TcpConn | null = null;
  private requestId = 0;

  constructor(host: string, port: number, password: string) {
    this.host = host;
    this.port = port;
    this.password = password;
  }

  private createPacket(id: number, type: number, body: string): Uint8Array {
    const bodyBytes = new TextEncoder().encode(body + "\0\0");
    const length = 4 + 4 + bodyBytes.length;
    const buffer = new ArrayBuffer(4 + length);
    const view = new DataView(buffer);
    
    view.setInt32(0, length, true);
    view.setInt32(4, id, true);
    view.setInt32(8, type, true);
    
    const uint8 = new Uint8Array(buffer);
    uint8.set(bodyBytes, 12);
    
    return uint8;
  }

  private async readPacket(): Promise<{ id: number; type: number; body: string }> {
    if (!this.conn) throw new Error("Not connected");
    
    const lengthBuf = new Uint8Array(4);
    await this.conn.read(lengthBuf);
    const length = new DataView(lengthBuf.buffer).getInt32(0, true);
    
    const dataBuf = new Uint8Array(length);
    await this.conn.read(dataBuf);
    
    const view = new DataView(dataBuf.buffer);
    const id = view.getInt32(0, true);
    const type = view.getInt32(4, true);
    const body = new TextDecoder().decode(dataBuf.slice(8, -2));
    
    return { id, type, body };
  }

  async connect(): Promise<boolean> {
    try {
      console.log(`Connecting to RCON at ${this.host}:${this.port}`);
      this.conn = await Deno.connect({ hostname: this.host, port: this.port });
      
      const authPacket = this.createPacket(++this.requestId, 3, this.password);
      await this.conn.write(authPacket);
      
      const response = await this.readPacket();
      console.log("RCON auth response:", response);
      
      return response.id !== -1;
    } catch (error) {
      console.error("RCON connection error:", error);
      return false;
    }
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.conn) throw new Error("Not connected");
    
    console.log(`Sending RCON command: ${command}`);
    const packet = this.createPacket(++this.requestId, 2, command);
    await this.conn.write(packet);
    
    const response = await this.readPacket();
    console.log("RCON command response:", response);
    
    return response.body;
  }

  close() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
  }
}

// Helper to send emails
async function sendEmail(supabaseUrl: string, supabaseKey: string, emailData: any) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(emailData),
    });
    
    if (!response.ok) {
      console.error("Email send failed:", await response.text());
    } else {
      console.log("Email sent successfully");
    }
  } catch (err) {
    console.error("Email error:", err);
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Rank Expiry Check Started ===");
    console.log("Time:", new Date().toISOString());

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rconHost = Deno.env.get("RCON_HOST");
    const rconPort = parseInt(Deno.env.get("RCON_PORT") || "25575");
    const rconPassword = Deno.env.get("RCON_PASSWORD");

    const now = new Date();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const utcMidnightMs = (d: Date) =>
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

    // Fetch all active ranks
    const ranksResponse = await fetch(
      `${supabaseUrl}/rest/v1/active_ranks?is_active=eq.true&select=*`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    const activeRanks = await ranksResponse.json();
    console.log(`Found ${activeRanks?.length || 0} active ranks`);

    if (!activeRanks || activeRanks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active ranks to process" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let rcon: RCONClient | null = null;
    let rconConnected = false;

    // Connect to RCON
    if (rconHost && rconPassword) {
      rcon = new RCONClient(rconHost, rconPort, rconPassword);
      try {
        rconConnected = await rcon.connect();
        console.log("RCON connected:", rconConnected);
      } catch (err) {
        console.error("Failed to connect to RCON:", err);
      }
    }

    const expiredRanks: string[] = [];
    const remindersSent: string[] = [];

    for (const rank of activeRanks) {
      const expiresAt = new Date(rank.expires_at);
      const daysLeft = Math.floor((utcMidnightMs(expiresAt) - utcMidnightMs(now)) / MS_PER_DAY);

      console.log(`Processing rank: ${rank.rank_name} for ${rank.minecraft_username}, expires: ${expiresAt.toISOString()}, days left: ${daysLeft}`);

      // Check if expired
      if (expiresAt <= now) {
        console.log(`Rank EXPIRED: ${rank.rank_name} for ${rank.minecraft_username}`);

        // Remove rank via RCON (using removetemp for temporary ranks)
        if (rconConnected && rcon) {
          try {
            const command = `lp user ${rank.minecraft_username} parent removetemp ${rank.rank_name}`;
            const result = await rcon.sendCommand(command);
            console.log(`RCON remove result for ${rank.minecraft_username}:`, result);
            expiredRanks.push(`${rank.minecraft_username} - ${rank.rank_name}`);

            // Log the removal
            await fetch(`${supabaseUrl}/rest/v1/logs`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Prefer": "return=minimal",
              },
              body: JSON.stringify({
                type: "rcon",
                message: `Rank expired and removed: ${rank.rank_name} from ${rank.minecraft_username}`,
                order_id: rank.order_id,
                metadata: { command, result, expiresAt: rank.expires_at },
              }),
            });
          } catch (err: any) {
            console.error(`Failed to remove rank for ${rank.minecraft_username}:`, err);

            // Log the error
            await fetch(`${supabaseUrl}/rest/v1/logs`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Prefer": "return=minimal",
              },
              body: JSON.stringify({
                type: "error",
                message: `Failed to remove expired rank ${rank.rank_name} from ${rank.minecraft_username}`,
                order_id: rank.order_id,
                metadata: { error: err.message },
              }),
            });
          }
        }

        // Mark rank as inactive
        await fetch(`${supabaseUrl}/rest/v1/active_ranks?id=eq.${rank.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            is_active: false,
            removed_at: now.toISOString(),
          }),
        });

      } else if (daysLeft === 2) {
        // Send reminder email exactly 2 days before expiry (calendar days, UTC)
        if (rank.order_id) {
          // Fetch order to get user email
          const orderResponse = await fetch(
            `${supabaseUrl}/rest/v1/orders?id=eq.${rank.order_id}&select=user_email,minecraft_username`,
            {
              headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
              },
            }
          );

          const orders = await orderResponse.json();
           if (orders && orders.length > 0 && orders[0].user_email) {
            // Send expiry reminder email
            await sendEmail(supabaseUrl, supabaseKey, {
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

            // Log the reminder
            await fetch(`${supabaseUrl}/rest/v1/logs`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Prefer": "return=minimal",
              },
              body: JSON.stringify({
                type: "info",
                message: `Expiry reminder sent: ${rank.rank_name} for ${rank.minecraft_username} (${daysLeft} days left)`,
                order_id: rank.order_id,
                metadata: { daysLeft, expiresAt: rank.expires_at, email: orders[0].user_email },
              }),
            });
          }
        }
      }
    }

    // Close RCON connection
    if (rcon) {
      rcon.close();
    }

    const summary = {
      success: true,
      processedAt: now.toISOString(),
      totalActiveRanks: activeRanks.length,
      expiredRanksRemoved: expiredRanks.length,
      expiredRanks,
      remindersSent: remindersSent.length,
      reminders: remindersSent,
      rconConnected,
    };

    console.log("=== Rank Expiry Check Complete ===");
    console.log(JSON.stringify(summary, null, 2));

    // Log the job run
    await fetch(`${supabaseUrl}/rest/v1/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        type: "admin",
        message: `Rank expiry check: ${expiredRanks.length} removed, ${remindersSent.length} reminders sent`,
        metadata: summary,
      }),
    });

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Rank expiry check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
