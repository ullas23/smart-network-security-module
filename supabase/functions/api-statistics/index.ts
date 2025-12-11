import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const agentId = url.searchParams.get('agent_id');
    const hoursAgo = parseInt(url.searchParams.get('hours') || '24');
    const granularity = url.searchParams.get('granularity') || 'minute'; // minute, hour, day

    const since = new Date(Date.now() - hoursAgo * 3600000).toISOString();

    // Get traffic stats
    let statsQuery = supabase
      .from('traffic_stats')
      .select('*')
      .gte('timestamp', since)
      .order('timestamp', { ascending: true });

    if (agentId) {
      statsQuery = statsQuery.eq('agent_id', agentId);
    }

    const { data: stats, error: statsError } = await statsQuery;

    if (statsError) {
      return new Response(
        JSON.stringify({ error: statsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get alert counts by severity
    const { data: alertCounts } = await supabase
      .from('alerts')
      .select('severity')
      .gte('timestamp', since);

    const severityCounts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const alert of alertCounts || []) {
      if (alert.severity && severityCounts[alert.severity] !== undefined) {
        severityCounts[alert.severity]++;
      }
    }

    // Get blocklist stats
    const { count: activeBlocks } = await supabase
      .from('blocklist')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    // Get top threat IPs
    const { data: topThreats } = await supabase
      .from('threat_scores')
      .select('ip_address, combined_score, classification, alert_count')
      .gte('combined_score', 30)
      .order('combined_score', { ascending: false })
      .limit(10);

    // Aggregate stats if needed
    const aggregatedStats = stats || [];
    
    // Calculate summary
    const summary = {
      total_packets: aggregatedStats.reduce((sum, s) => sum + (s.packets_per_sec || 0), 0),
      total_bytes: aggregatedStats.reduce((sum, s) => sum + (s.bytes_per_sec || 0), 0),
      avg_cpu: aggregatedStats.length > 0 
        ? aggregatedStats.reduce((sum, s) => sum + (s.cpu_percent || 0), 0) / aggregatedStats.length 
        : 0,
      avg_memory: aggregatedStats.length > 0 
        ? aggregatedStats.reduce((sum, s) => sum + (s.memory_percent || 0), 0) / aggregatedStats.length 
        : 0,
      total_alerts: Object.values(severityCounts).reduce((a, b) => a + b, 0),
      active_blocks: activeBlocks || 0,
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        time_range: { from: since, to: new Date().toISOString(), hours: hoursAgo },
        summary,
        severity_breakdown: severityCounts,
        traffic_stats: aggregatedStats,
        top_threats: topThreats || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Statistics API exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
