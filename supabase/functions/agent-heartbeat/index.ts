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

    const { agent_id, cpu, mem, traffic_bps, packets_captured, alerts_generated } = await req.json();

    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: 'agent_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SNSM] Heartbeat from agent: ${agent_id}`);

    // Update agent status
    const { error: agentError } = await supabase
      .from('agents')
      .update({
        status: 'online',
        last_seen: new Date().toISOString(),
        cpu_percent: cpu || 0,
        memory_percent: mem || 0,
        network_bps: traffic_bps || 0,
        packets_captured: packets_captured || 0,
        alerts_generated: alerts_generated || 0,
      })
      .eq('agent_id', agent_id);

    if (agentError) {
      console.error('[SNSM] Heartbeat update error:', agentError);
      return new Response(
        JSON.stringify({ error: agentError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert traffic stats for time-series
    const { error: statsError } = await supabase
      .from('traffic_stats')
      .insert({
        agent_id,
        packets_per_sec: Math.floor((packets_captured || 0) / 60),
        bytes_per_sec: traffic_bps || 0,
        cpu_percent: cpu || 0,
        memory_percent: mem || 0,
      });

    if (statsError) {
      console.warn('[SNSM] Stats insert warning:', statsError);
    }

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Heartbeat exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
