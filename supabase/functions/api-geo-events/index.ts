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
    const severity = url.searchParams.get('severity');
    const country = url.searchParams.get('country');
    const hoursAgo = parseInt(url.searchParams.get('hours') || '24');

    const since = new Date(Date.now() - hoursAgo * 3600000).toISOString();

    let query = supabase
      .from('geo_events')
      .select('*', { count: 'exact' })
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity);
    }
    if (country) {
      query = query.or(`src_country.eq.${country},dst_country.eq.${country}`);
    }

    const { data, error, count } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate by country
    const countryStats: Record<string, { attacks: number; severity_breakdown: Record<string, number> }> = {};
    for (const event of data || []) {
      const country = event.src_country || 'Unknown';
      if (!countryStats[country]) {
        countryStats[country] = { attacks: 0, severity_breakdown: {} };
      }
      countryStats[country].attacks++;
      const sev = event.severity || 'medium';
      countryStats[country].severity_breakdown[sev] = (countryStats[country].severity_breakdown[sev] || 0) + 1;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        count,
        events: data,
        country_stats: countryStats,
        time_range: { from: since, to: new Date().toISOString() }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Geo events API exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
