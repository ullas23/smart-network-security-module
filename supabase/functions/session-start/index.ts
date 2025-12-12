import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * SNSM Session Start Endpoint
 * Automatically detects user IP and initializes monitoring session
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IP Utilities (inlined for Edge Function compatibility)
function normalizeIp(ip: string): string {
  if (!ip) return '';
  let normalized = ip.replace(/^::ffff:/i, '');
  normalized = normalized.replace(/^\[|\]$/g, '');
  normalized = normalized.trim();
  if (normalized === '::1' || normalized === 'localhost') {
    return '127.0.0.1';
  }
  return normalized;
}

function isValidIPv4(ip: string): boolean {
  const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return pattern.test(ip);
}

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

const PRIVATE_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '100.64.0.0', end: '100.127.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
];

function isPrivateIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (!isValidIPv4(normalized)) return false;
  
  const ipNum = ipToNumber(normalized);
  for (const range of PRIVATE_RANGES) {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);
    if (ipNum >= startNum && ipNum <= endNum) return true;
  }
  return false;
}

function extractIp(request: Request): string {
  const headers = request.headers;
  
  // Priority: CF-Connecting-IP > True-Client-IP > X-Real-IP > X-Forwarded-For
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return normalizeIp(cfConnectingIp);
  
  const trueClientIp = headers.get('true-client-ip');
  if (trueClientIp) return normalizeIp(trueClientIp);
  
  const realIp = headers.get('x-real-ip');
  if (realIp) return normalizeIp(realIp);
  
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    const clientIp = normalizeIp(ips[0]);
    if (clientIp && isValidIPv4(clientIp)) return clientIp;
  }
  
  const forwarded = headers.get('forwarded');
  if (forwarded) {
    const match = forwarded.match(/for=["']?([^"',;\s]+)/i);
    if (match) return normalizeIp(match[1]);
  }
  
  return '0.0.0.0';
}

function detectVpnProxy(headers: Headers): { isVpn: boolean; indicators: string[] } {
  const indicators: string[] = [];
  
  const xff = headers.get('x-forwarded-for');
  if (xff && xff.split(',').length > 2) {
    indicators.push('multiple_proxies');
  }
  
  const via = headers.get('via');
  if (via) {
    indicators.push('via_header_present');
  }
  
  return { isVpn: indicators.length > 0, indicators };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract client IP from request
    const clientIp = extractIp(req);
    const normalized = normalizeIp(clientIp);
    const isPrivate = isPrivateIp(normalized);
    const vpnInfo = detectVpnProxy(req.headers);
    
    // Parse optional body for session metadata
    let sessionData = {};
    try {
      if (req.method === "POST") {
        sessionData = await req.json();
      }
    } catch {
      // No body or invalid JSON - that's fine
    }

    const hostname = (sessionData as any)?.hostname || `session-${Date.now()}`;
    
    // Generate session/agent ID
    const sessionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Log the session start
    console.log(`[SESSION_START] IP: ${normalized}, Session: ${sessionId}, Private: ${isPrivate}, VPN: ${vpnInfo.isVpn}`);
    
    // Register as agent if not private IP
    let agentId = null;
    if (!isPrivate && normalized !== '0.0.0.0') {
      // Check if agent already exists for this IP
      const { data: existingAgent } = await supabase
        .from("agents")
        .select("agent_id")
        .eq("ip_address", normalized)
        .maybeSingle();
      
      if (existingAgent) {
        agentId = existingAgent.agent_id;
        // Update last seen
        await supabase
          .from("agents")
          .update({ 
            last_seen: timestamp,
            status: "online" 
          })
          .eq("agent_id", agentId);
      } else {
        // Create new agent
        agentId = crypto.randomUUID();
        await supabase.from("agents").insert({
          agent_id: agentId,
          hostname,
          ip_address: normalized,
          status: "online",
          version: "1.0.0",
          os: (sessionData as any)?.os || "web-client",
          last_seen: timestamp,
        });
      }
    }
    
    // Build comprehensive response
    const response = {
      success: true,
      session: {
        id: sessionId,
        started_at: timestamp,
      },
      ip: {
        detected: normalized,
        raw: clientIp,
        is_private: isPrivate,
        is_valid: isValidIPv4(normalized),
        version: isValidIPv4(normalized) ? 4 : null,
      },
      network: {
        vpn_proxy_detected: vpnInfo.isVpn,
        indicators: vpnInfo.indicators,
        headers_received: {
          cf_connecting_ip: req.headers.get('cf-connecting-ip') ? true : false,
          x_forwarded_for: req.headers.get('x-forwarded-for') ? true : false,
          x_real_ip: req.headers.get('x-real-ip') ? true : false,
        },
      },
      agent: agentId ? {
        id: agentId,
        registered: true,
        monitoring_enabled: true,
      } : {
        registered: false,
        reason: isPrivate ? 'private_ip' : 'detection_failed',
      },
      monitoring: {
        enabled: !isPrivate && normalized !== '0.0.0.0',
        target_ip: !isPrivate ? normalized : null,
        message: isPrivate 
          ? 'Private IP detected. Enter a public IP for network monitoring.'
          : 'Monitoring session initialized. Ready to capture network traffic.',
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[SESSION_START] Error:", message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message,
        ip: { detected: null, is_valid: false }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
