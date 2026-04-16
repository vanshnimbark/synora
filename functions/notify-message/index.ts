import { createClient } from "jsr:@supabase/supabase-js@2";

interface NotifyPayload {
  match_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase env vars for notify-message.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as NotifyPayload;
    if (!payload.recipient_id || !payload.match_id) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recipient, error: recipientError } = await supabase
      .from("users")
      .select("expo_push_token,full_name")
      .eq("id", payload.recipient_id)
      .maybeSingle<{ expo_push_token: string | null; full_name: string }>();

    if (recipientError || !recipient?.expo_push_token) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "no_push_token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: sender } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", payload.sender_id)
      .maybeSingle<{ full_name: string }>();

    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
      },
      body: JSON.stringify({
        to: recipient.expo_push_token,
        title: sender?.full_name ?? "New message",
        body: payload.content,
        data: {
          route: "/(tabs)/chat/[matchId]",
          matchId: payload.match_id,
        },
      }),
    });

    const expoBody = await expoRes.text();
    return new Response(JSON.stringify({ ok: expoRes.ok, expoBody }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: expoRes.ok ? 200 : 500,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
