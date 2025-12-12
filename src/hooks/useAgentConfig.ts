import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AgentConfig {
  targetIP: string;
  agentId: string;
  hostname: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const useAgentConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const registerAgent = useCallback(async (targetIP: string, hostname: string) => {
    setIsConnecting(true);
    
    try {
      const response = await supabase.functions.invoke("agent-register", {
        body: {
          hostname,
          ip_address: targetIP,
          version: "1.0.0",
          os: navigator.platform || "Unknown",
        },
      });

      if (response.error) throw response.error;

      const { agent_id } = response.data;
      
      setConfig({
        targetIP,
        agentId: agent_id,
        hostname,
      });
      setIsConnected(true);

      toast({
        title: "Agent Registered",
        description: `Connected to ${targetIP} with agent ID: ${agent_id.slice(0, 8)}...`,
      });

      // Start heartbeat
      startHeartbeat(agent_id);

      return agent_id;
    } catch (error) {
      console.error("Agent registration failed:", error);
      toast({
        title: "Connection Failed",
        description: "Could not register agent. Check network settings.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const startHeartbeat = useCallback((agentId: string) => {
    const interval = setInterval(async () => {
      try {
        await supabase.functions.invoke("agent-heartbeat", {
          body: {
            agent_id: agentId,
            cpu_percent: Math.random() * 30 + 10,
            memory_percent: Math.random() * 40 + 20,
            network_bps: Math.floor(Math.random() * 100000000),
            packets_captured: Math.floor(Math.random() * 1000),
            alerts_generated: Math.floor(Math.random() * 10),
          },
        });
      } catch (error) {
        console.error("Heartbeat failed:", error);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const disconnect = useCallback(() => {
    setConfig(null);
    setIsConnected(false);
    toast({
      title: "Disconnected",
      description: "Agent connection terminated.",
    });
  }, [toast]);

  return {
    config,
    isConnecting,
    isConnected,
    registerAgent,
    disconnect,
  };
};

// Hook for simulating packet data for demo purposes
export const useSimulatedTraffic = (agentId: string | null, enabled = false) => {
  const simulateTraffic = useCallback(async () => {
    if (!agentId || !enabled) return;

    const protocols = ["tcp", "udp", "icmp"] as const;
    const services = ["http", "https", "ssh", "dns", "smtp", "ftp", null];
    
    try {
      // Simulate flow data
      await supabase.functions.invoke("agent-flows", {
        body: {
          agent_id: agentId,
          flows: Array.from({ length: 5 }, () => ({
            src_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            dst_ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            src_port: Math.floor(Math.random() * 65535),
            dst_port: [80, 443, 22, 53, 25, 3389][Math.floor(Math.random() * 6)],
            protocol: protocols[Math.floor(Math.random() * protocols.length)],
            bytes_sent: Math.floor(Math.random() * 100000),
            bytes_recv: Math.floor(Math.random() * 500000),
            packets_sent: Math.floor(Math.random() * 100),
            packets_recv: Math.floor(Math.random() * 200),
            duration: Math.random() * 60,
            service: services[Math.floor(Math.random() * services.length)],
          })),
        },
      });

      // Occasionally simulate Suricata alerts
      if (Math.random() > 0.7) {
        const severities = ["low", "medium", "high", "critical"] as const;
        const categories = [
          "Potential Corporate Privacy Violation",
          "Attempted Information Leak",
          "Misc Attack",
          "Web Application Attack",
          "Attempted Administrator Privilege Gain",
          "A Network Trojan was detected",
        ];
        
        await supabase.functions.invoke("agent-suricata", {
          body: {
            agent_id: agentId,
            alerts: [{
              signature_id: `200${Math.floor(Math.random() * 9999)}`,
              signature_name: categories[Math.floor(Math.random() * categories.length)],
              severity: severities[Math.floor(Math.random() * severities.length)],
              src_ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
              dst_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
              src_port: Math.floor(Math.random() * 65535),
              dst_port: [80, 443, 22, 53, 25, 3389][Math.floor(Math.random() * 6)],
              protocol: protocols[Math.floor(Math.random() * protocols.length)],
              category: categories[Math.floor(Math.random() * categories.length)],
            }],
          },
        });
      }
    } catch (error) {
      console.error("Traffic simulation error:", error);
    }
  }, [agentId, enabled]);

  return { simulateTraffic };
};
