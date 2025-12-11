import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const agentId = req.headers.get('x-agent-id') || new URL(req.url).searchParams.get('agent_id');

    console.log(`[SNSM] Blocklist request from agent: ${agentId || 'global'}`);

    // Get active blocklist entries that haven't expired
    const now = new Date().toISOString();
    
    let query = supabase
      .from('blocklist')
      .select('ip_address, reason, threat_score, source, expires_at, created_at')
      .eq('active', true);

    // Filter by agent or get global blocklist
    if (agentId) {
      query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SNSM] Blocklist fetch error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter expired entries
    const activeEntries = (data || []).filter(entry => {
      if (!entry.expires_at) return true;
      return new Date(entry.expires_at) > new Date(now);
    });

    // Generate nftables rules format
    const nftablesRules = activeEntries.map(entry => ({
      ip: entry.ip_address,
      action: 'drop',
      comment: `SNSM_BLOCK: ${entry.reason || 'threat_detected'}`,
      expires: entry.expires_at,
    }));

    console.log(`[SNSM] Returning ${activeEntries.length} blocklist entries`);

    return new Response(
      JSON.stringify({ 
        success: true,
        count: activeEntries.length,
        blocklist: activeEntries,
        nftables_rules: nftablesRules,
        generated_at: now,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Blocklist exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
