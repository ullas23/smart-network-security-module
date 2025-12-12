import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IpInfo {
  detected: string;
  raw: string;
  is_private: boolean;
  is_valid: boolean;
  version: number | null;
}

interface NetworkInfo {
  vpn_proxy_detected: boolean;
  indicators: string[];
  headers_received: {
    cf_connecting_ip: boolean;
    x_forwarded_for: boolean;
    x_real_ip: boolean;
  };
}

interface AgentInfo {
  id: string | null;
  registered: boolean;
  monitoring_enabled?: boolean;
  reason?: string;
}

interface MonitoringInfo {
  enabled: boolean;
  target_ip: string | null;
  message: string;
}

interface SessionData {
  success: boolean;
  session: {
    id: string;
    started_at: string;
  };
  ip: IpInfo;
  network: NetworkInfo;
  agent: AgentInfo;
  monitoring: MonitoringInfo;
}

export const useSession = () => {
  const { toast } = useToast();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get user's OS info
      const os = navigator.platform || navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown';
      
      const response = await supabase.functions.invoke("session-start", {
        body: {
          hostname: `web-${Date.now()}`,
          os,
        },
      });

      if (response.error) throw response.error;

      const data = response.data as SessionData;
      setSession(data);

      if (data.success) {
        console.log(`[SNSM] Session started. IP: ${data.ip.detected}, Agent: ${data.agent?.id || 'N/A'}`);
        
        if (data.ip.is_private) {
          toast({
            title: "Private Network Detected",
            description: "Your IP appears to be private. Enter a public IP for full monitoring.",
            variant: "default",
          });
        } else if (data.monitoring.enabled) {
          toast({
            title: "Session Initialized",
            description: `Monitoring IP: ${data.ip.detected}`,
          });
        }
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize session";
      setError(message);
      console.error("[SNSM] Session init error:", err);
      
      toast({
        title: "Session Error",
        description: message,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  return {
    session,
    isLoading,
    error,
    ip: session?.ip?.detected || null,
    isPrivateIp: session?.ip?.is_private || false,
    isVpnDetected: session?.network?.vpn_proxy_detected || false,
    agentId: session?.agent?.id || null,
    monitoringEnabled: session?.monitoring?.enabled || false,
    refreshSession: initSession,
  };
};
