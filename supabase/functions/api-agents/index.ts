import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent is considered offline if no heartbeat for 2 minutes
const OFFLINE_THRESHOLD_MS = 120000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const agentId = url.searchParams.get('id');

    if (agentId) {
      // Get specific agent
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Agent not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if agent is actually online
      const lastSeen = new Date(data.last_seen).getTime();
      const isOnline = Date.now() - lastSeen < OFFLINE_THRESHOLD_MS;
      
      // Get recent stats
      const { data: recentStats } = await supabase
        .from('traffic_stats')
        .select('*')
        .eq('agent_id', agentId)
        .order('timestamp', { ascending: false })
        .limit(60);

      // Get alert count in last hour
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count: alertCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .gte('timestamp', oneHourAgo);

      return new Response(
        JSON.stringify({ 
          success: true,
          agent: {
            ...data,
            is_online: isOnline,
            computed_status: isOnline ? data.status : 'offline',
          },
          stats: recentStats || [],
          alerts_last_hour: alertCount || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // List all agents
      const { data, error, count } = await supabase
        .from('agents')
        .select('*', { count: 'exact' })
        .order('last_seen', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Compute online status for each agent
      const agentsWithStatus = (data || []).map(agent => {
        const lastSeen = new Date(agent.last_seen).getTime();
        const isOnline = Date.now() - lastSeen < OFFLINE_THRESHOLD_MS;
        return {
          ...agent,
          is_online: isOnline,
          computed_status: isOnline ? agent.status : 'offline',
        };
      });

      const onlineCount = agentsWithStatus.filter(a => a.is_online).length;

      return new Response(
        JSON.stringify({ 
          success: true,
          count,
          online_count: onlineCount,
          offline_count: (count || 0) - onlineCount,
          agents: agentsWithStatus,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('[SNSM] Agents API exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
