import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default TTL for auto-blocks (1 hour)
const DEFAULT_TTL_MS = 3600000;

interface BlockRequest {
  action: 'block' | 'unblock';
  ip: string;
  reason?: string;
  ttl_seconds?: number;
  agent_id?: string;
  source?: 'manual' | 'auto' | 'correlation' | 'ml';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: BlockRequest = await req.json();
    const { action, ip, reason, ttl_seconds, agent_id, source } = body;

    if (!action || !ip) {
      return new Response(
        JSON.stringify({ error: 'action and ip are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SNSM] Firewall ${action}: ${ip} (agent: ${agent_id || 'global'})`);

    if (action === 'block') {
      const ttlMs = (ttl_seconds || 3600) * 1000;
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();

      const { data, error } = await supabase
        .from('blocklist')
        .upsert({
          ip_address: ip,
          reason: reason || 'Manual block',
          source: source || 'manual',
          agent_id: agent_id || null,
          expires_at: expiresAt,
          active: true,
        }, { onConflict: 'ip_address,agent_id' })
        .select()
        .single();

      if (error) {
        console.error('[SNSM] Block insert error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate nftables command for the agent
      const nftablesCmd = generateNftablesBlockCommand(ip, reason);

      console.log(`[SNSM] IP ${ip} blocked until ${expiresAt}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          action: 'blocked',
          ip,
          expires_at: expiresAt,
          blocklist_entry: data,
          nftables_command: nftablesCmd,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'unblock') {
      const { error } = await supabase
        .from('blocklist')
        .update({ active: false })
        .eq('ip_address', ip);

      if (error) {
        console.error('[SNSM] Unblock error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate nftables unblock command
      const nftablesCmd = generateNftablesUnblockCommand(ip);

      console.log(`[SNSM] IP ${ip} unblocked`);

      return new Response(
        JSON.stringify({ 
          success: true,
          action: 'unblocked',
          ip,
          nftables_command: nftablesCmd,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "block" or "unblock"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Firewall orchestrator exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateNftablesBlockCommand(ip: string, reason?: string): string {
  const comment = `SNSM_BLOCK_${Date.now()}`;
  return `nft add rule inet snsm input ip saddr ${ip} drop comment "${comment}: ${reason || 'threat_detected'}"`;
}

function generateNftablesUnblockCommand(ip: string): string {
  return `nft delete rule inet snsm input handle $(nft -a list chain inet snsm input | grep "${ip}" | awk '{print $NF}')`;
}
