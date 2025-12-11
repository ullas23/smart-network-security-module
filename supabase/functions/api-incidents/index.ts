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
    
    if (req.method === 'GET') {
      const incidentId = url.searchParams.get('id');
      const status = url.searchParams.get('status');
      const severity = url.searchParams.get('severity');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      if (incidentId) {
        // Get specific incident with related data
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incidentId)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get related alerts
        const relatedAlertIds = data.related_alerts || [];
        let relatedAlerts = [];
        if (relatedAlertIds.length > 0) {
          const { data: alerts } = await supabase
            .from('alerts')
            .select('*')
            .in('id', relatedAlertIds);
          relatedAlerts = alerts || [];
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            incident: data,
            related_alerts: relatedAlerts,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // List incidents
      let query = supabase
        .from('incidents')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }
      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error, count } = await query;

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
          incidents: data,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      // Create new incident
      const body = await req.json();
      const { title, description, severity, src_ip, dst_ip, related_alerts, related_flows } = body;

      if (!title) {
        return new Response(
          JSON.stringify({ error: 'title is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('incidents')
        .insert({
          title,
          description,
          severity: severity || 'medium',
          src_ip,
          dst_ip,
          related_alerts: related_alerts || [],
          related_flows: related_flows || [],
          status: 'open',
          timeline: [{ timestamp: new Date().toISOString(), action: 'created', details: 'Incident created' }],
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, incident: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PATCH') {
      // Update incident
      const body = await req.json();
      const { id, status, assigned_to, timeline_entry } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current incident
      const { data: current } = await supabase
        .from('incidents')
        .select('timeline')
        .eq('id', id)
        .single();

      const updates: Record<string, any> = {};
      if (status) {
        updates.status = status;
        if (status === 'resolved') {
          updates.resolved_at = new Date().toISOString();
        }
      }
      if (assigned_to !== undefined) {
        updates.assigned_to = assigned_to;
      }

      // Add timeline entry
      if (timeline_entry || status) {
        const newTimeline = current?.timeline || [];
        newTimeline.push({
          timestamp: new Date().toISOString(),
          action: timeline_entry?.action || 'status_change',
          details: timeline_entry?.details || `Status changed to ${status}`,
        });
        updates.timeline = newTimeline;
      }

      const { data, error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, incident: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Incidents API exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
