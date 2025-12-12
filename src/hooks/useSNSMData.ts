import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";

export type Alert = Tables<"alerts">;
export type Flow = Tables<"flows">;
export type Agent = Tables<"agents">;
export type ThreatScore = Tables<"threat_scores">;
export type Blocklist = Tables<"blocklist">;
export type TrafficStats = Tables<"traffic_stats">;
export type Incident = Tables<"incidents">;
export type GeoEvent = Tables<"geo_events">;

// Fetch alerts with real-time subscription
export const useAlerts = (limit = 50) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["alerts", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          queryClient.setQueryData<Alert[]>(["alerts", limit], (old) => {
            if (!old) return [payload.new as Alert];
            return [payload.new as Alert, ...old.slice(0, limit - 1)];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, limit]);

  return query;
};

// Fetch flows with real-time subscription
export const useFlows = (limit = 100) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["flows", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("flows-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "flows" },
        (payload) => {
          queryClient.setQueryData<Flow[]>(["flows", limit], (old) => {
            if (!old) return [payload.new as Flow];
            return [payload.new as Flow, ...old.slice(0, limit - 1)];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, limit]);

  return query;
};

// Fetch agents with real-time subscription
export const useAgents = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("last_seen", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("agents-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["agents"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Fetch threat scores with real-time subscription
export const useThreatScores = (limit = 20) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["threat_scores", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threat_scores")
        .select("*")
        .order("combined_score", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("threat-scores-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "threat_scores" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["threat_scores", limit] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, limit]);

  return query;
};

// Fetch blocklist with real-time subscription
export const useBlocklist = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["blocklist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocklist")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("blocklist-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocklist" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["blocklist"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Fetch traffic stats with real-time subscription
export const useTrafficStats = (limit = 60) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["traffic_stats", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traffic_stats")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data?.reverse() || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds for live chart
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("traffic-stats-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "traffic_stats" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["traffic_stats", limit] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, limit]);

  return query;
};

// Fetch incidents
export const useIncidents = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("incidents-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["incidents"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Fetch geo events
export const useGeoEvents = (limit = 50) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["geo_events", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geo_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("geo-events-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "geo_events" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["geo_events", limit] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, limit]);

  return query;
};

// Aggregate statistics hook
export const useSNSMStats = () => {
  const { data: alerts } = useAlerts();
  const { data: agents } = useAgents();
  const { data: blocklist } = useBlocklist();
  const { data: threatScores } = useThreatScores();

  const stats = {
    totalAlerts: alerts?.length || 0,
    criticalAlerts: alerts?.filter((a) => a.severity === "critical").length || 0,
    highAlerts: alerts?.filter((a) => a.severity === "high").length || 0,
    mediumAlerts: alerts?.filter((a) => a.severity === "medium").length || 0,
    lowAlerts: alerts?.filter((a) => a.severity === "low").length || 0,
    onlineAgents: agents?.filter((a) => a.status === "online").length || 0,
    totalAgents: agents?.length || 0,
    blockedIPs: blocklist?.length || 0,
    avgThreatScore: threatScores?.length
      ? threatScores.reduce((sum, ts) => sum + (ts.combined_score || 0), 0) / threatScores.length
      : 0,
    maxThreatScore: threatScores?.length
      ? Math.max(...threatScores.map((ts) => ts.combined_score || 0))
      : 0,
  };

  return stats;
};

// Global threat level calculation
export const useGlobalThreatLevel = () => {
  const { data: threatScores } = useThreatScores();
  const { data: alerts } = useAlerts(100);
  
  const [threatLevel, setThreatLevel] = useState({
    score: 0,
    status: "safe" as "safe" | "warning" | "danger",
    label: "Systems Secure",
  });

  useEffect(() => {
    // Calculate composite threat score
    const avgScore = threatScores?.length
      ? threatScores.reduce((sum, ts) => sum + (ts.combined_score || 0), 0) / threatScores.length
      : 0;
    
    const criticalCount = alerts?.filter((a) => a.severity === "critical").length || 0;
    const highCount = alerts?.filter((a) => a.severity === "high").length || 0;
    
    // Weighted formula for global threat
    const compositeScore = Math.min(100, avgScore * 0.5 + criticalCount * 5 + highCount * 2);
    
    let status: "safe" | "warning" | "danger" = "safe";
    let label = "Systems Secure";
    
    if (compositeScore >= 70) {
      status = "danger";
      label = "Critical Alert";
    } else if (compositeScore >= 30) {
      status = "warning";
      label = "Elevated Risk";
    }

    setThreatLevel({ score: compositeScore, status, label });
  }, [threatScores, alerts]);

  return threatLevel;
};
