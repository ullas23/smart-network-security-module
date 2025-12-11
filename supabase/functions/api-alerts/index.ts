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
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const severity = url.searchParams.get('severity');
    const agentId = url.searchParams.get('agent_id');
    const srcIp = url.searchParams.get('src_ip');
    const acknowledged = url.searchParams.get('acknowledged');

    let query = supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (severity) {
      query = query.eq('severity', severity);
    }
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    if (srcIp) {
      query = query.eq('src_ip', srcIp);
    }
    if (acknowledged !== null) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[SNSM] Alerts fetch error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        count,
        alerts: data,
        pagination: { limit, offset, total: count }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Alerts API exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
