// ClubCampus — supabase/functions/invite-user/index.ts
// Sendet eine Einladungs-E-Mail via Supabase Auth Admin API
// Wird aufgerufen wenn ein Admin einem Mitglied Portal-Zugang geben will
// aber noch kein Konto existiert.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Nur authentifizierte Admins dürfen diese Function aufrufen
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, redirect_url } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "E-Mail fehlt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin-Client mit Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Prüfen ob Benutzer bereits existiert
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const exists = existingUsers?.users?.some(u => u.email === email);

    if (exists) {
      return new Response(JSON.stringify({ error: "Ein Konto mit dieser E-Mail existiert bereits. Bitte direkt verknüpfen." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Einladung senden
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirect_url || "https://clubcampus.app",
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
