import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-id',
};

// Severity mapping for Suricata
const severityMap: Record<number, string> = {
  1: 'critical',
  2: 'high',
  3: 'medium',
  4: 'low',
};

// Compute Suricata score based on severity and signature
function computeSuricataScore(alert: any): number {
  const severityWeight: Record<string, number> = {
    critical: 90,
    high: 70,
    medium: 50,
    low: 25,
  };
  
  const severity = severityMap[alert.severity] || 'medium';
  let score = severityWeight[severity] || 50;
  
  // Boost for certain categories
  if (alert.category?.includes('Malware') || alert.category?.includes('Exploit')) {
    score = Math.min(100, score + 15);
  }
  
  return score;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agent_id, alerts } = await req.json();

    if (!agent_id || !Array.isArray(alerts)) {
      return new Response(
        JSON.stringify({ error: 'agent_id and alerts array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SNSM] Suricata alerts from ${agent_id}: ${alerts.length} alerts`);

    const processedAlerts = alerts.map((alert: any) => ({
      agent_id,
      src_ip: alert.src_ip || alert.src || '0.0.0.0',
      src_port: alert.src_port || null,
      dst_ip: alert.dest_ip || alert.dst || '0.0.0.0',
      dst_port: alert.dest_port || null,
      protocol: (alert.proto || 'tcp').toLowerCase(),
      signature_id: alert.signature_id?.toString() || alert.sid?.toString(),
      signature_name: alert.signature || alert.msg || 'Unknown signature',
      severity: severityMap[alert.severity] || 'medium',
      category: alert.category || 'Unclassified',
      threat_score: computeSuricataScore(alert),
      event_type: 'suricata',
      raw_data: alert,
      timestamp: alert.timestamp || new Date().toISOString(),
    }));

    // Insert alerts
    const { data: insertedAlerts, error: insertError } = await supabase
      .from('alerts')
      .insert(processedAlerts)
      .select();

    if (insertError) {
      console.error('[SNSM] Suricata insert error:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update threat scores for involved IPs
    for (const alert of processedAlerts) {
      await updateThreatScore(supabase, alert.src_ip, 'suricata', alert.threat_score);
    }

    // Trigger correlation check
    await triggerCorrelation(supabase, processedAlerts);

    console.log(`[SNSM] Processed ${processedAlerts.length} Suricata alerts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedAlerts.length,
        alerts: insertedAlerts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Suricata exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateThreatScore(supabase: any, ip: string, source: string, score: number) {
  try {
    // Get existing threat score
    const { data: existing } = await supabase
      .from('threat_scores')
      .select('*')
      .eq('ip_address', ip)
      .maybeSingle();

    if (existing) {
      // Update with weighted average
      const newSuricataScore = source === 'suricata' 
        ? Math.max(existing.suricata_score || 0, score) 
        : existing.suricata_score || 0;
      
      const combined = (
        newSuricataScore * 0.4 +
        (existing.zeek_score || 0) * 0.25 +
        (existing.anomaly_score || 0) * 0.20 +
        (existing.ml_score || 0) * 0.15
      );

      await supabase
        .from('threat_scores')
        .update({
          suricata_score: newSuricataScore,
          combined_score: combined,
          alert_count: (existing.alert_count || 0) + 1,
          last_seen: new Date().toISOString(),
          classification: combined >= 60 ? 'malicious' : combined >= 30 ? 'suspicious' : 'benign',
        })
        .eq('ip_address', ip);
    } else {
      // Insert new
      await supabase
        .from('threat_scores')
        .insert({
          ip_address: ip,
          suricata_score: score,
          combined_score: score * 0.4,
          alert_count: 1,
          classification: score >= 60 ? 'malicious' : score >= 30 ? 'suspicious' : 'benign',
        });
    }
  } catch (error) {
    console.warn('[SNSM] Threat score update warning:', error);
  }
}

async function triggerCorrelation(supabase: any, alerts: any[]) {
  // Check if any IP crosses threshold
  for (const alert of alerts) {
    const { data: threatScore } = await supabase
      .from('threat_scores')
      .select('combined_score')
      .eq('ip_address', alert.src_ip)
      .maybeSingle();

    if (threatScore && threatScore.combined_score >= 60) {
      console.log(`[SNSM] High threat detected: ${alert.src_ip} (${threatScore.combined_score})`);
      
      // Auto-block if threshold exceeded
      await supabase
        .from('blocklist')
        .upsert({
          ip_address: alert.src_ip,
          reason: `Auto-blocked: threat_score=${threatScore.combined_score.toFixed(1)}`,
          threat_score: threatScore.combined_score,
          source: 'correlation',
          active: true,
          expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour TTL
        }, { onConflict: 'ip_address,agent_id' });
    }
  }
}
