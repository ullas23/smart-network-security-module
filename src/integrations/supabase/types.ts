export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          agent_id: string
          alerts_generated: number | null
          cpu_percent: number | null
          created_at: string | null
          hostname: string
          id: string
          ip_address: string | null
          last_seen: string | null
          memory_percent: number | null
          network_bps: number | null
          os: string | null
          packets_captured: number | null
          status: Database["public"]["Enums"]["agent_status"] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          agent_id: string
          alerts_generated?: number | null
          cpu_percent?: number | null
          created_at?: string | null
          hostname: string
          id?: string
          ip_address?: string | null
          last_seen?: string | null
          memory_percent?: number | null
          network_bps?: number | null
          os?: string | null
          packets_captured?: number | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          agent_id?: string
          alerts_generated?: number | null
          cpu_percent?: number | null
          created_at?: string | null
          hostname?: string
          id?: string
          ip_address?: string | null
          last_seen?: string | null
          memory_percent?: number | null
          network_bps?: number | null
          os?: string | null
          packets_captured?: number | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          acknowledged: boolean | null
          agent_id: string | null
          category: string | null
          created_at: string | null
          dst_ip: string
          dst_port: number | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          geo_dst: Json | null
          geo_src: Json | null
          id: string
          protocol: Database["public"]["Enums"]["protocol_type"] | null
          raw_data: Json | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          signature_id: string | null
          signature_name: string | null
          src_ip: string
          src_port: number | null
          threat_score: number | null
          timestamp: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          agent_id?: string | null
          category?: string | null
          created_at?: string | null
          dst_ip: string
          dst_port?: number | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          geo_dst?: Json | null
          geo_src?: Json | null
          id?: string
          protocol?: Database["public"]["Enums"]["protocol_type"] | null
          raw_data?: Json | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          signature_id?: string | null
          signature_name?: string | null
          src_ip: string
          src_port?: number | null
          threat_score?: number | null
          timestamp?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          agent_id?: string | null
          category?: string | null
          created_at?: string | null
          dst_ip?: string
          dst_port?: number | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          geo_dst?: Json | null
          geo_src?: Json | null
          id?: string
          protocol?: Database["public"]["Enums"]["protocol_type"] | null
          raw_data?: Json | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          signature_id?: string | null
          signature_name?: string | null
          src_ip?: string
          src_port?: number | null
          threat_score?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      anomaly_baselines: {
        Row: {
          agent_id: string | null
          created_at: string | null
          ewma_value: number | null
          id: string
          last_updated: string | null
          mean_value: number | null
          metric_name: string
          sample_count: number | null
          std_value: number | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          ewma_value?: number | null
          id?: string
          last_updated?: string | null
          mean_value?: number | null
          metric_name: string
          sample_count?: number | null
          std_value?: number | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          ewma_value?: number | null
          id?: string
          last_updated?: string | null
          mean_value?: number | null
          metric_name?: string
          sample_count?: number | null
          std_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_baselines_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      blocklist: {
        Row: {
          active: boolean | null
          agent_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string
          reason: string | null
          source: Database["public"]["Enums"]["block_source"] | null
          threat_score: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          agent_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
          reason?: string | null
          source?: Database["public"]["Enums"]["block_source"] | null
          threat_score?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          agent_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
          source?: Database["public"]["Enums"]["block_source"] | null
          threat_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocklist_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      flows: {
        Row: {
          agent_id: string | null
          anomaly_score: number | null
          bytes_recv: number | null
          bytes_sent: number | null
          conn_state: string | null
          created_at: string | null
          dst_ip: string
          dst_port: number | null
          duration: number | null
          flags: Json | null
          id: string
          ml_score: number | null
          packets_recv: number | null
          packets_sent: number | null
          protocol: Database["public"]["Enums"]["protocol_type"] | null
          service: string | null
          src_ip: string
          src_port: number | null
          threat_score: number | null
          timestamp: string | null
        }
        Insert: {
          agent_id?: string | null
          anomaly_score?: number | null
          bytes_recv?: number | null
          bytes_sent?: number | null
          conn_state?: string | null
          created_at?: string | null
          dst_ip: string
          dst_port?: number | null
          duration?: number | null
          flags?: Json | null
          id?: string
          ml_score?: number | null
          packets_recv?: number | null
          packets_sent?: number | null
          protocol?: Database["public"]["Enums"]["protocol_type"] | null
          service?: string | null
          src_ip: string
          src_port?: number | null
          threat_score?: number | null
          timestamp?: string | null
        }
        Update: {
          agent_id?: string | null
          anomaly_score?: number | null
          bytes_recv?: number | null
          bytes_sent?: number | null
          conn_state?: string | null
          created_at?: string | null
          dst_ip?: string
          dst_port?: number | null
          duration?: number | null
          flags?: Json | null
          id?: string
          ml_score?: number | null
          packets_recv?: number | null
          packets_sent?: number | null
          protocol?: Database["public"]["Enums"]["protocol_type"] | null
          service?: string | null
          src_ip?: string
          src_port?: number | null
          threat_score?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flows_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      geo_events: {
        Row: {
          alert_id: string | null
          created_at: string | null
          dst_city: string | null
          dst_country: string | null
          dst_ip: string
          dst_lat: number | null
          dst_lon: number | null
          id: string
          severity: Database["public"]["Enums"]["severity_level"] | null
          src_city: string | null
          src_country: string | null
          src_ip: string
          src_lat: number | null
          src_lon: number | null
          threat_score: number | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string | null
          dst_city?: string | null
          dst_country?: string | null
          dst_ip: string
          dst_lat?: number | null
          dst_lon?: number | null
          id?: string
          severity?: Database["public"]["Enums"]["severity_level"] | null
          src_city?: string | null
          src_country?: string | null
          src_ip: string
          src_lat?: number | null
          src_lon?: number | null
          threat_score?: number | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string | null
          dst_city?: string | null
          dst_country?: string | null
          dst_ip?: string
          dst_lat?: number | null
          dst_lon?: number | null
          id?: string
          severity?: Database["public"]["Enums"]["severity_level"] | null
          src_city?: string | null
          src_country?: string | null
          src_ip?: string
          src_lat?: number | null
          src_lon?: number | null
          threat_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "geo_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          dst_ip: string | null
          id: string
          related_alerts: string[] | null
          related_flows: string[] | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          src_ip: string | null
          status: string | null
          threat_score: number | null
          timeline: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          dst_ip?: string | null
          id?: string
          related_alerts?: string[] | null
          related_flows?: string[] | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          src_ip?: string | null
          status?: string | null
          threat_score?: number | null
          timeline?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          dst_ip?: string | null
          id?: string
          related_alerts?: string[] | null
          related_flows?: string[] | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          src_ip?: string | null
          status?: string | null
          threat_score?: number | null
          timeline?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      threat_scores: {
        Row: {
          alert_count: number | null
          anomaly_score: number | null
          classification: string | null
          combined_score: number | null
          created_at: string | null
          flow_count: number | null
          id: string
          ip_address: string
          last_seen: string | null
          ml_score: number | null
          suricata_score: number | null
          updated_at: string | null
          zeek_score: number | null
        }
        Insert: {
          alert_count?: number | null
          anomaly_score?: number | null
          classification?: string | null
          combined_score?: number | null
          created_at?: string | null
          flow_count?: number | null
          id?: string
          ip_address: string
          last_seen?: string | null
          ml_score?: number | null
          suricata_score?: number | null
          updated_at?: string | null
          zeek_score?: number | null
        }
        Update: {
          alert_count?: number | null
          anomaly_score?: number | null
          classification?: string | null
          combined_score?: number | null
          created_at?: string | null
          flow_count?: number | null
          id?: string
          ip_address?: string
          last_seen?: string | null
          ml_score?: number | null
          suricata_score?: number | null
          updated_at?: string | null
          zeek_score?: number | null
        }
        Relationships: []
      }
      traffic_stats: {
        Row: {
          agent_id: string | null
          alerts_per_min: number | null
          blocked_per_min: number | null
          bytes_per_sec: number | null
          connections_per_sec: number | null
          cpu_percent: number | null
          created_at: string | null
          id: string
          memory_percent: number | null
          packets_per_sec: number | null
          timestamp: string | null
        }
        Insert: {
          agent_id?: string | null
          alerts_per_min?: number | null
          blocked_per_min?: number | null
          bytes_per_sec?: number | null
          connections_per_sec?: number | null
          cpu_percent?: number | null
          created_at?: string | null
          id?: string
          memory_percent?: number | null
          packets_per_sec?: number | null
          timestamp?: string | null
        }
        Update: {
          agent_id?: string | null
          alerts_per_min?: number | null
          blocked_per_min?: number | null
          bytes_per_sec?: number | null
          connections_per_sec?: number | null
          cpu_percent?: number | null
          created_at?: string | null
          id?: string
          memory_percent?: number | null
          packets_per_sec?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traffic_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["agent_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      agent_status: "online" | "offline" | "degraded" | "maintenance"
      block_source: "manual" | "auto" | "correlation" | "ml"
      event_type: "suricata" | "zeek" | "anomaly" | "ml" | "system"
      protocol_type: "tcp" | "udp" | "icmp" | "other"
      severity_level: "low" | "medium" | "high" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_status: ["online", "offline", "degraded", "maintenance"],
      block_source: ["manual", "auto", "correlation", "ml"],
      event_type: ["suricata", "zeek", "anomaly", "ml", "system"],
      protocol_type: ["tcp", "udp", "icmp", "other"],
      severity_level: ["low", "medium", "high", "critical"],
    },
  },
} as const
