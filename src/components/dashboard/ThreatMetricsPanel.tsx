import { useState, useEffect } from "react";
import { ThreatMetrics, generateMetrics } from "@/data/mockAlerts";
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
  const [metrics, setMetrics] = useState<ThreatMetrics>(generateMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        totalAlerts: prev.totalAlerts + Math.floor(Math.random() * 5),
        criticalCount: prev.criticalCount + (Math.random() > 0.9 ? 1 : 0),
        highCount: prev.highCount + (Math.random() > 0.8 ? 1 : 0),
        activeConnections: prev.activeConnections + Math.floor(Math.random() * 10 - 5),
        bytesAnalyzed: prev.bytesAnalyzed + Math.floor(Math.random() * 1000000),
        packetsProcessed: prev.packetsProcessed + Math.floor(Math.random() * 1000),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <CyberCard title="System Metrics" icon={<Activity className="w-4 h-4" />}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatDisplay
          label="Total Alerts"
          value={formatNumber(metrics.totalAlerts)}
          trend="up"
        />
        <StatDisplay
          label="Critical Threats"
          value={metrics.criticalCount}
          variant="threat"
          trend={metrics.criticalCount > 40 ? "up" : "neutral"}
        />
        <StatDisplay
          label="Active Connections"
          value={formatNumber(metrics.activeConnections)}
          subValue="real-time"
        />
        <StatDisplay
          label="Blocked IPs"
          value={metrics.blockedIPs}
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
              {formatBytes(metrics.bytesAnalyzed)}
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
              {formatNumber(metrics.packetsProcessed)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-warning/10">
            <AlertOctagon className="w-4 h-4 text-warning" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">High Severity</div>
            <div className="text-sm font-mono text-warning">{metrics.highCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-info/10">
            <Shield className="w-4 h-4 text-info" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Avg Threat Score</div>
            <div className="text-sm font-mono text-foreground">
              {metrics.avgThreatScore.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </CyberCard>
  );
};

export default ThreatMetricsPanel;
