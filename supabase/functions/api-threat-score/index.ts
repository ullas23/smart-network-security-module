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
    const ip = url.searchParams.get('ip');

    if (ip) {
      // Get specific IP threat score
      const { data, error } = await supabase
        .from('threat_scores')
        .select('*')
        .eq('ip_address', ip)
        .maybeSingle();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({ 
            ip_address: ip,
            combined_score: 0,
            classification: 'unknown',
            message: 'No threat data for this IP'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get recent alerts for this IP
      const { data: recentAlerts } = await supabase
        .from('alerts')
        .select('id, timestamp, severity, signature_name, threat_score')
        .eq('src_ip', ip)
        .order('timestamp', { ascending: false })
        .limit(10);

      // Get recent flows for this IP
      const { data: recentFlows } = await supabase
        .from('flows')
        .select('id, timestamp, dst_ip, bytes_sent, bytes_recv, service')
        .eq('src_ip', ip)
        .order('timestamp', { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({ 
          success: true,
          threat_score: data,
          recent_alerts: recentAlerts || [],
          recent_flows: recentFlows || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Get top threat scores
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const minScore = parseFloat(url.searchParams.get('min_score') || '0');

      const { data, error, count } = await supabase
        .from('threat_scores')
        .select('*', { count: 'exact' })
        .gte('combined_score', minScore)
        .order('combined_score', { ascending: false })
        .limit(limit);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          count,
          threat_scores: data,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('[SNSM] Threat score API exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
