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

    const { agent_id, flows } = await req.json();

    if (!agent_id || !Array.isArray(flows)) {
      return new Response(
        JSON.stringify({ error: 'agent_id and flows array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SNSM] Flow data from ${agent_id}: ${flows.length} flows`);

    const processedFlows = flows.map((flow: any) => ({
      agent_id,
      src_ip: flow.src_ip || flow.src || '0.0.0.0',
      src_port: flow.src_port,
      dst_ip: flow.dst_ip || flow.dst || '0.0.0.0',
      dst_port: flow.dst_port,
      protocol: (flow.protocol || flow.proto || 'tcp').toLowerCase(),
      bytes_sent: flow.bytes_sent || flow.orig_bytes || 0,
      bytes_recv: flow.bytes_recv || flow.resp_bytes || 0,
      packets_sent: flow.packets_sent || flow.orig_pkts || 0,
      packets_recv: flow.packets_recv || flow.resp_pkts || 0,
      duration: flow.duration || 0,
      service: flow.service || null,
      conn_state: flow.conn_state || null,
      threat_score: flow.threat_score || 0,
      anomaly_score: flow.anomaly_score || 0,
      ml_score: flow.ml_score || 0,
      flags: flow.flags || null,
      timestamp: flow.timestamp || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('flows')
      .insert(processedFlows)
      .select();

    if (error) {
      console.error('[SNSM] Flow insert error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SNSM] Inserted ${processedFlows.length} flows`);

    return new Response(
      JSON.stringify({ success: true, processed: processedFlows.length, flows: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Flow exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
