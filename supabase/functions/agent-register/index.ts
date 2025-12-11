import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-id, x-hmac-signature, x-timestamp',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agent_id, hostname, os, version, ip_address } = await req.json();

    if (!agent_id || !hostname) {
      return new Response(
        JSON.stringify({ error: 'agent_id and hostname are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SNSM] Agent registration: ${agent_id} (${hostname})`);

    // Upsert agent
    const { data, error } = await supabase
      .from('agents')
      .upsert({
        agent_id,
        hostname,
        os: os || 'unknown',
        version: version || '1.0.0',
        ip_address: ip_address || null,
        status: 'online',
        last_seen: new Date().toISOString(),
      }, { onConflict: 'agent_id' })
      .select()
      .single();

    if (error) {
      console.error('[SNSM] Agent registration error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SNSM] Agent registered successfully: ${agent_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        agent: data,
        message: 'Agent registered successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Agent registration exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
