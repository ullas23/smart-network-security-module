import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-id',
};

// Compute Zeek behavioral score
function computeZeekScore(log: any): number {
  let score = 0;
  
  // Connection state analysis
  const suspiciousStates = ['S0', 'REJ', 'RSTO', 'RSTOS0', 'SH', 'SHR'];
  if (suspiciousStates.includes(log.conn_state)) {
    score += 30;
  }
  
  // Duration anomalies
  if (log.duration && log.duration < 0.1 && log.orig_bytes > 1000) {
    score += 20; // Fast data exfiltration
  }
  
  // Large data transfer
  if ((log.orig_bytes || 0) + (log.resp_bytes || 0) > 10000000) {
    score += 15;
  }
  
  // Service-based scoring
  const riskyServices = ['ssh', 'telnet', 'ftp', 'smb'];
  if (riskyServices.includes(log.service?.toLowerCase())) {
    score += 10;
  }
  
  // DNS tunneling indicators
  if (log.service === 'dns' && (log.query?.length || 0) > 50) {
    score += 40;
  }
  
  // Port scan indicators
  if (log.conn_state === 'S0' && !log.service) {
    score += 25;
  }
  
  return Math.min(100, score);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agent_id, logs } = await req.json();

    if (!agent_id || !Array.isArray(logs)) {
      return new Response(
        JSON.stringify({ error: 'agent_id and logs array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SNSM] Zeek logs from ${agent_id}: ${logs.length} entries`);

    const processedFlows = logs.map((log: any) => ({
      agent_id,
      src_ip: log.id_orig_h || log.src || '0.0.0.0',
      src_port: log.id_orig_p || log.src_port,
      dst_ip: log.id_resp_h || log.dst || '0.0.0.0',
      dst_port: log.id_resp_p || log.dst_port,
      protocol: (log.proto || 'tcp').toLowerCase(),
      bytes_sent: log.orig_bytes || 0,
      bytes_recv: log.resp_bytes || 0,
      packets_sent: log.orig_pkts || 0,
      packets_recv: log.resp_pkts || 0,
      duration: log.duration || 0,
      service: log.service || null,
      conn_state: log.conn_state || null,
      threat_score: computeZeekScore(log),
      flags: log,
      timestamp: log.ts ? new Date(log.ts * 1000).toISOString() : new Date().toISOString(),
    }));

    // Insert flows
    const { data: insertedFlows, error: insertError } = await supabase
      .from('flows')
      .insert(processedFlows)
      .select();

    if (insertError) {
      console.error('[SNSM] Zeek insert error:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update threat scores for high-risk flows
    for (const flow of processedFlows) {
      if (flow.threat_score > 20) {
        await updateThreatScore(supabase, flow.src_ip, 'zeek', flow.threat_score);
      }
    }

    // Generate alerts for suspicious behaviors
    const suspiciousFlows = processedFlows.filter(f => f.threat_score >= 50);
    for (const flow of suspiciousFlows) {
      await supabase
        .from('alerts')
        .insert({
          agent_id,
          src_ip: flow.src_ip,
          src_port: flow.src_port,
          dst_ip: flow.dst_ip,
          dst_port: flow.dst_port,
          protocol: flow.protocol,
          severity: flow.threat_score >= 70 ? 'high' : 'medium',
          category: 'Behavioral Anomaly',
          signature_name: `Zeek: Suspicious ${flow.conn_state || 'connection'} behavior`,
          threat_score: flow.threat_score,
          event_type: 'zeek',
          raw_data: flow.flags,
        });
    }

    console.log(`[SNSM] Processed ${processedFlows.length} Zeek flows, ${suspiciousFlows.length} suspicious`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedFlows.length,
        suspicious: suspiciousFlows.length,
        flows: insertedFlows 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Zeek exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateThreatScore(supabase: any, ip: string, source: string, score: number) {
  try {
    const { data: existing } = await supabase
      .from('threat_scores')
      .select('*')
      .eq('ip_address', ip)
      .maybeSingle();

    if (existing) {
      const newZeekScore = Math.max(existing.zeek_score || 0, score);
      const combined = (
        (existing.suricata_score || 0) * 0.4 +
        newZeekScore * 0.25 +
        (existing.anomaly_score || 0) * 0.20 +
        (existing.ml_score || 0) * 0.15
      );

      await supabase
        .from('threat_scores')
        .update({
          zeek_score: newZeekScore,
          combined_score: combined,
          flow_count: (existing.flow_count || 0) + 1,
          last_seen: new Date().toISOString(),
          classification: combined >= 60 ? 'malicious' : combined >= 30 ? 'suspicious' : 'benign',
        })
        .eq('ip_address', ip);
    } else {
      await supabase
        .from('threat_scores')
        .insert({
          ip_address: ip,
          zeek_score: score,
          combined_score: score * 0.25,
          flow_count: 1,
          classification: score >= 60 ? 'malicious' : score >= 30 ? 'suspicious' : 'benign',
        });
    }
  } catch (error) {
    console.warn('[SNSM] Threat score update warning:', error);
  }
}
