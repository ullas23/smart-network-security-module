import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Database, RefreshCw, Download, Search, CheckCircle2, AlertTriangle, Info, Terminal } from "lucide-react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MatrixRain from "@/components/effects/MatrixRain";
import CyberCard from "@/components/ui/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

const LogsPage = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Generate mock logs from recent database activity
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // Fetch recent alerts for log entries
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch recent flows
      const { data: flows } = await supabase
        .from('flows')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch agents
      const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

      const logEntries: LogEntry[] = [];

      // Convert alerts to log entries
      alerts?.forEach(alert => {
        logEntries.push({
          id: `alert-${alert.id}`,
          timestamp: alert.created_at || new Date().toISOString(),
          level: alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 
                 alert.severity === 'medium' ? 'warn' : 'info',
          source: 'suricata',
          message: `[ALERT] ${alert.signature_name || 'Unknown'} - ${alert.src_ip} → ${alert.dst_ip}`,
          metadata: { alert_id: alert.id, threat_score: alert.threat_score }
        });
      });

      // Convert flows to log entries
      flows?.slice(0, 10).forEach(flow => {
        logEntries.push({
          id: `flow-${flow.id}`,
          timestamp: flow.created_at || new Date().toISOString(),
          level: 'debug',
          source: 'zeek',
          message: `[FLOW] ${flow.protocol?.toUpperCase()} ${flow.src_ip}:${flow.src_port} → ${flow.dst_ip}:${flow.dst_port} (${flow.service || 'unknown'})`,
          metadata: { flow_id: flow.id, bytes: (flow.bytes_sent || 0) + (flow.bytes_recv || 0) }
        });
      });

      // Convert agent updates to log entries
      agents?.forEach(agent => {
        logEntries.push({
          id: `agent-${agent.id}`,
          timestamp: agent.updated_at || new Date().toISOString(),
          level: agent.status === 'online' ? 'info' : agent.status === 'degraded' ? 'warn' : 'error',
          source: 'agent-manager',
          message: `[AGENT] ${agent.hostname} (${agent.ip_address}) status: ${agent.status}`,
          metadata: { agent_id: agent.agent_id }
        });
      });

      // Sort by timestamp
      logEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setLogs(logEntries);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'info': return <Info className="w-4 h-4 text-info" />;
      default: return <Terminal className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-destructive';
      case 'warn': return 'text-warning';
      case 'info': return 'text-info';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <MatrixRain />
      <div className="fixed inset-0 pointer-events-none scanlines z-10" />

      <div className="relative z-20 flex w-full">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen">
          <Header />

          <main className="flex-1 p-6 overflow-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold text-primary text-glow mb-2">System Logs</h1>
                <p className="text-sm text-muted-foreground">
                  Real-time log aggregation from all SNSM components
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchLogs} className="border-primary/20">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" className="border-primary/20">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </motion.div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background border-primary/20"
                />
              </div>
            </div>

            {/* Logs */}
            <CyberCard title={`Logs (${filteredLogs.length})`} icon={<Database className="w-4 h-4" />}>
              <div className="font-mono text-xs space-y-1 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No logs found</div>
                ) : (
                  filteredLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 py-1.5 px-2 hover:bg-primary/5 rounded transition-colors"
                    >
                      <span className="text-muted-foreground shrink-0 w-20">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </span>
                      {getLevelIcon(log.level)}
                      <Badge variant="outline" className="shrink-0 text-[10px] py-0">
                        {log.source}
                      </Badge>
                      <span className={getLevelColor(log.level)}>
                        {log.message}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </CyberCard>

            {/* Verification Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-4 rounded border border-success/20 bg-success/5"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <div className="font-medium text-success mb-1">Data Verification</div>
                  <div className="text-sm text-muted-foreground">
                    These logs are generated from actual database records. Each log entry corresponds to:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>Alerts:</strong> Suricata IDS detections stored in the alerts table</li>
                      <li><strong>Flows:</strong> Zeek network flows from the flows table</li>
                      <li><strong>Agents:</strong> Agent heartbeat and status updates</li>
                    </ul>
                    <p className="mt-2">
                      To verify: Check the database directly or compare timestamps with edge function logs.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;