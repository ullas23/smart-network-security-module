-- =============================================
-- SNSM (Smart Network Security Module) Database Schema
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================

CREATE TYPE public.severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.agent_status AS ENUM ('online', 'offline', 'degraded', 'maintenance');
CREATE TYPE public.block_source AS ENUM ('manual', 'auto', 'correlation', 'ml');
CREATE TYPE public.event_type AS ENUM ('suricata', 'zeek', 'anomaly', 'ml', 'system');
CREATE TYPE public.protocol_type AS ENUM ('tcp', 'udp', 'icmp', 'other');

-- =============================================
-- AGENTS TABLE
-- =============================================

CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT UNIQUE NOT NULL,
  hostname TEXT NOT NULL,
  os TEXT,
  version TEXT,
  ip_address TEXT,
  last_seen TIMESTAMPTZ DEFAULT now(),
  status agent_status DEFAULT 'offline',
  cpu_percent REAL DEFAULT 0,
  memory_percent REAL DEFAULT 0,
  network_bps BIGINT DEFAULT 0,
  packets_captured BIGINT DEFAULT 0,
  alerts_generated BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ALERTS TABLE
-- =============================================

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT REFERENCES public.agents(agent_id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  src_ip TEXT NOT NULL,
  src_port INTEGER,
  dst_ip TEXT NOT NULL,
  dst_port INTEGER,
  protocol protocol_type DEFAULT 'tcp',
  signature_id TEXT,
  signature_name TEXT,
  severity severity_level DEFAULT 'medium',
  category TEXT,
  threat_score REAL DEFAULT 0 CHECK (threat_score >= 0 AND threat_score <= 100),
  event_type event_type DEFAULT 'suricata',
  raw_data JSONB,
  geo_src JSONB,
  geo_dst JSONB,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FLOWS TABLE
-- =============================================

CREATE TABLE public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT REFERENCES public.agents(agent_id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  src_ip TEXT NOT NULL,
  src_port INTEGER,
  dst_ip TEXT NOT NULL,
  dst_port INTEGER,
  protocol protocol_type DEFAULT 'tcp',
  bytes_sent BIGINT DEFAULT 0,
  bytes_recv BIGINT DEFAULT 0,
  packets_sent BIGINT DEFAULT 0,
  packets_recv BIGINT DEFAULT 0,
  duration REAL DEFAULT 0,
  service TEXT,
  conn_state TEXT,
  threat_score REAL DEFAULT 0,
  anomaly_score REAL DEFAULT 0,
  ml_score REAL DEFAULT 0,
  flags JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- BLOCKLIST TABLE
-- =============================================

CREATE TABLE public.blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  reason TEXT,
  threat_score REAL DEFAULT 0,
  source block_source DEFAULT 'auto',
  agent_id TEXT REFERENCES public.agents(agent_id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ip_address, agent_id)
);

-- =============================================
-- THREAT SCORES TABLE (per-IP aggregation)
-- =============================================

CREATE TABLE public.threat_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT UNIQUE NOT NULL,
  suricata_score REAL DEFAULT 0,
  zeek_score REAL DEFAULT 0,
  anomaly_score REAL DEFAULT 0,
  ml_score REAL DEFAULT 0,
  combined_score REAL DEFAULT 0,
  alert_count INTEGER DEFAULT 0,
  flow_count INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT now(),
  classification TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INCIDENTS TABLE (for SOC investigation)
-- =============================================

CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity severity_level DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  src_ip TEXT,
  dst_ip TEXT,
  threat_score REAL DEFAULT 0,
  related_alerts UUID[] DEFAULT '{}',
  related_flows UUID[] DEFAULT '{}',
  timeline JSONB DEFAULT '[]',
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- STATISTICS TABLE (time-series traffic data)
-- =============================================

CREATE TABLE public.traffic_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT REFERENCES public.agents(agent_id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  packets_per_sec BIGINT DEFAULT 0,
  bytes_per_sec BIGINT DEFAULT 0,
  connections_per_sec INTEGER DEFAULT 0,
  alerts_per_min INTEGER DEFAULT 0,
  blocked_per_min INTEGER DEFAULT 0,
  cpu_percent REAL DEFAULT 0,
  memory_percent REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- GEO EVENTS TABLE (for threat map)
-- =============================================

CREATE TABLE public.geo_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
  src_ip TEXT NOT NULL,
  dst_ip TEXT NOT NULL,
  src_lat REAL,
  src_lon REAL,
  src_country TEXT,
  src_city TEXT,
  dst_lat REAL,
  dst_lon REAL,
  dst_country TEXT,
  dst_city TEXT,
  severity severity_level DEFAULT 'medium',
  threat_score REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ANOMALY BASELINES TABLE
-- =============================================

CREATE TABLE public.anomaly_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT REFERENCES public.agents(agent_id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  ewma_value REAL DEFAULT 0,
  mean_value REAL DEFAULT 0,
  std_value REAL DEFAULT 1,
  sample_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, metric_name)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_alerts_timestamp ON public.alerts(timestamp DESC);
CREATE INDEX idx_alerts_src_ip ON public.alerts(src_ip);
CREATE INDEX idx_alerts_dst_ip ON public.alerts(dst_ip);
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_alerts_agent ON public.alerts(agent_id);

CREATE INDEX idx_flows_timestamp ON public.flows(timestamp DESC);
CREATE INDEX idx_flows_src_ip ON public.flows(src_ip);
CREATE INDEX idx_flows_dst_ip ON public.flows(dst_ip);
CREATE INDEX idx_flows_agent ON public.flows(agent_id);

CREATE INDEX idx_blocklist_ip ON public.blocklist(ip_address);
CREATE INDEX idx_blocklist_active ON public.blocklist(active);
CREATE INDEX idx_blocklist_expires ON public.blocklist(expires_at);

CREATE INDEX idx_threat_scores_ip ON public.threat_scores(ip_address);
CREATE INDEX idx_threat_scores_combined ON public.threat_scores(combined_score DESC);

CREATE INDEX idx_traffic_stats_timestamp ON public.traffic_stats(timestamp DESC);
CREATE INDEX idx_traffic_stats_agent ON public.traffic_stats(agent_id);

CREATE INDEX idx_geo_events_timestamp ON public.geo_events(created_at DESC);

CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agents_last_seen ON public.agents(last_seen DESC);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blocklist_updated_at
  BEFORE UPDATE ON public.blocklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_threat_scores_updated_at
  BEFORE UPDATE ON public.threat_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES (Public access for agents, restricted for UI)
-- =============================================

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_baselines ENABLE ROW LEVEL SECURITY;

-- Public read access (agents can read, UI can read)
CREATE POLICY "Allow public read on agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Allow public read on alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Allow public read on flows" ON public.flows FOR SELECT USING (true);
CREATE POLICY "Allow public read on blocklist" ON public.blocklist FOR SELECT USING (true);
CREATE POLICY "Allow public read on threat_scores" ON public.threat_scores FOR SELECT USING (true);
CREATE POLICY "Allow public read on incidents" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Allow public read on traffic_stats" ON public.traffic_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read on geo_events" ON public.geo_events FOR SELECT USING (true);
CREATE POLICY "Allow public read on anomaly_baselines" ON public.anomaly_baselines FOR SELECT USING (true);

-- Service role write access (via edge functions)
CREATE POLICY "Allow service write on agents" ON public.agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on alerts" ON public.alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on flows" ON public.flows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on blocklist" ON public.blocklist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on threat_scores" ON public.threat_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on incidents" ON public.incidents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on traffic_stats" ON public.traffic_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on geo_events" ON public.geo_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on anomaly_baselines" ON public.anomaly_baselines FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- ENABLE REALTIME FOR DASHBOARD
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.flows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocklist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threat_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.geo_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.traffic_stats;