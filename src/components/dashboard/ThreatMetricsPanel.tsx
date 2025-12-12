import { useSNSMStats, useAlerts, useFlows } from "@/hooks/useSNSMData";
import CyberCard from "@/components/ui/CyberCard";
import StatDisplay from "@/components/ui/StatDisplay";
import { Activity, Shield, Wifi, Database, AlertOctagon } from "lucide-react";

const formatBytes = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const ThreatMetricsPanel = () => {
  const stats = useSNSMStats();
  const { data: flows } = useFlows(100);
  
  // Calculate bytes analyzed from flows
  const bytesAnalyzed = flows?.reduce(
    (sum, flow) => sum + (flow.bytes_sent || 0) + (flow.bytes_recv || 0),
    0
  ) || 0;
  
  // Calculate packets from flows
  const packetsProcessed = flows?.reduce(
    (sum, flow) => sum + (flow.packets_sent || 0) + (flow.packets_recv || 0),
    0
  ) || 0;

  return (
    <CyberCard title="System Metrics" icon={<Activity className="w-4 h-4" />}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatDisplay
          label="Total Alerts"
          value={formatNumber(stats.totalAlerts)}
          trend={stats.totalAlerts > 0 ? "up" : "neutral"}
        />
        <StatDisplay
          label="Critical Threats"
          value={stats.criticalAlerts}
          variant="threat"
          trend={stats.criticalAlerts > 5 ? "up" : "neutral"}
        />
        <StatDisplay
          label="Active Agents"
          value={`${stats.onlineAgents}/${stats.totalAgents}`}
          subValue="connected"
        />
        <StatDisplay
          label="Blocked IPs"
          value={stats.blockedIPs}
          variant="success"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-primary/10">
            <Database className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Data Analyzed</div>
            <div className="text-sm font-mono text-foreground">
              {formatBytes(bytesAnalyzed)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-primary/10">
            <Wifi className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Packets</div>
            <div className="text-sm font-mono text-foreground">
              {formatNumber(packetsProcessed)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-warning/10">
            <AlertOctagon className="w-4 h-4 text-warning" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">High Severity</div>
            <div className="text-sm font-mono text-warning">{stats.highAlerts}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-info/10">
            <Shield className="w-4 h-4 text-info" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Avg Threat Score</div>
            <div className="text-sm font-mono text-foreground">
              {stats.avgThreatScore.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </CyberCard>
  );
};

export default ThreatMetricsPanel;
