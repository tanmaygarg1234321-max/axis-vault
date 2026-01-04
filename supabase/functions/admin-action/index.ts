import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Admin action:", action, params);

    switch (action) {
      case "toggle_maintenance": {
        await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.maintenance_mode`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ value: params.value }),
        });
        break;
      }

      case "retry_delivery": {
        // Get order details
        const orderResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${params.orderId}&select=*`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        );
        const orders = await orderResponse.json();
        if (orders && orders.length > 0) {
          const order = orders[0];
          const targetUsername = order.gift_to || order.minecraft_username;
          let command = "";

          if (order.product_type === "rank") {
            const rankName = order.product_name.replace(" Rank", "").toLowerCase();
            command = `/lp user ${targetUsername} parent set ${rankName}`;
          } else if (order.product_type === "money") {
            const amountStr = order.product_name.replace(" In-Game Money", "");
            let amount = 0;
            if (amountStr.includes("B")) {
              amount = parseFloat(amountStr.replace("B", "")) * 1000000000;
            } else if (amountStr.includes("M")) {
              amount = parseFloat(amountStr.replace("M", "")) * 1000000;
            }
            command = `/economy give ${targetUsername} ${Math.floor(amount)}`;
          } else if (order.product_type === "crate") {
            command = `Crate ${order.product_name} delivered to ${targetUsername}`;
          }

          // Update order
          await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              payment_status: "delivered",
              delivery_status: "delivered",
              command_executed: command,
            }),
          });

          // Log
          await fetch(`${supabaseUrl}/rest/v1/logs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              type: "delivery_retry",
              message: `Retry delivery for order ${order.order_id}`,
              order_id: order.id,
              metadata: { command },
            }),
          });
        }
        break;
      }

      case "create_coupon": {
        await fetch(`${supabaseUrl}/rest/v1/coupons`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(params.coupon),
        });
        break;
      }

      case "delete_coupon": {
        await fetch(`${supabaseUrl}/rest/v1/coupons?id=eq.${params.couponId}`, {
          method: "DELETE",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        });
        break;
      }

      default:
        throw new Error("Unknown action");
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Admin action error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
